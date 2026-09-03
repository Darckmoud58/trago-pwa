import { SignJWT, jwtVerify } from "jose";

export const PENDING_COOKIE = "trago_google_pending";
export const OAUTH_STATE_COOKIE = "trago_google_state";

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("AUTH_SECRET debe tener al menos 16 caracteres");
  }
  return new TextEncoder().encode(raw);
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(request: Request) {
  const fromEnv = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/promos";
  return value;
}

export async function signOAuthState(next: string) {
  return new SignJWT({ next, kind: "google-oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export async function readOAuthState(token: string) {
  const { payload } = await jwtVerify(token, secret());
  if (payload.kind !== "google-oauth") throw new Error("Estado inválido");
  return { next: safeNext(typeof payload.next === "string" ? payload.next : "/promos") };
}

export type GooglePending = {
  email: string;
  name: string;
  googleId: string;
  picture?: string;
};

export async function signPending(user: GooglePending) {
  return new SignJWT({ ...user, kind: "google-pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret());
}

export async function readPending(token: string): Promise<GooglePending | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "google-pending" || !payload.email || !payload.googleId) {
      return null;
    }
    return {
      email: String(payload.email),
      name: String(payload.name ?? ""),
      googleId: String(payload.googleId),
      picture: payload.picture ? String(payload.picture) : undefined,
    };
  } catch {
    return null;
  }
}

export function googleAuthUrl(origin: string, state: string) {
  const redirectUri = `${origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(origin: string, code: string) {
  const redirectUri = `${origin}/api/auth/google/callback`;
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokens = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens.error || "Google no devolvió el token");
  }
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!infoRes.ok || !info.sub || !info.email) {
    throw new Error("Google no envió correo verificado");
  }
  return {
    googleId: info.sub,
    email: info.email.toLowerCase().trim(),
    name: (info.name || info.email.split("@")[0]).slice(0, 80),
    picture: info.picture,
  };
}

export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
  };
}
