import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";
import { SESSION_COOKIE } from "./auth-cookie";

export { SESSION_COOKIE };

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("AUTH_SECRET debe tener al menos 16 caracteres");
  }
  return new TextEncoder().encode(raw);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    isAdult: user.isAdult,
    birthDate: user.birthDate,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSessionFromToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || payload.isAdult !== true) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      isAdult: true,
      birthDate: String(payload.birthDate ?? ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return readSessionFromToken(token);
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.AUTH_COOKIE_SECURE === "true",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
