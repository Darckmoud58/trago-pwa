import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

function secret() {
  const raw = process.env.AUTH_SECRET || "";
  return new TextEncoder().encode(raw);
}

/** Cualquier cuenta (joven o adulto). */
const PROTECTED_ANY = ["/cuenta", "/api/reportes", "/api/recompensas", "/api/opiniones"];

/** Solo 18+: alcohol, panel empresa, sync. */
const PROTECTED_ADULT = ["/panel", "/empresa", "/api/fuentes", "/api/panel", "/api/empresa"];

function isNightInMexico() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return hour >= 19 || hour < 6;
}

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if ((pathname === "/nocturno" || pathname.startsWith("/nocturno/")) && !isNightInMexico()) {
    const url = request.nextUrl.clone();
    url.pathname = "/promos";
    return NextResponse.redirect(url);
  }

  const needsAny = matches(pathname, PROTECTED_ANY);
  const needsAdult = matches(pathname, PROTECTED_ADULT);
  const needsAuth = needsAny || needsAdult;
  if (!needsAuth) {
    // Noche = contenido 18+; menores y visitants van a promos generales
    if (pathname === "/nocturno" || pathname.startsWith("/nocturno/")) {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (!token || !process.env.AUTH_SECRET) {
        const url = request.nextUrl.clone();
        url.pathname = "/entrar";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      try {
        const { payload } = await jwtVerify(token, secret());
        if (payload.isAdult !== true) {
          const url = request.nextUrl.clone();
          url.pathname = "/promos";
          return NextResponse.redirect(url);
        }
      } catch {
        const url = request.nextUrl.clone();
        url.pathname = "/entrar";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.AUTH_SECRET) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
    }
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) throw new Error("no sub");
    if (needsAdult && payload.isAdult !== true) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Esta función es solo para cuentas 18+." },
          { status: 403 },
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/cuenta";
      return NextResponse.redirect(url);
    }
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/nocturno",
    "/cuenta",
    "/panel",
    "/empresa",
    "/empresa/:path*",
    "/api/reportes/:path*",
    "/api/opiniones/:path*",
    "/api/fuentes/:path*",
    "/api/panel/:path*",
    "/api/recompensas/:path*",
    "/api/empresa/:path*",
  ],
};
