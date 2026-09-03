import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-cookie";

function secret() {
  const raw = process.env.AUTH_SECRET || "";
  return new TextEncoder().encode(raw);
}

const PROTECTED = ["/cuenta", "/panel", "/api/reportes", "/api/fuentes", "/api/panel"];

function isNightInMexico() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return hour >= 19 || hour < 6;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if ((pathname === "/nocturno" || pathname.startsWith("/nocturno/")) && !isNightInMexico()) {
    const url = request.nextUrl.clone();
    url.pathname = "/promos";
    return NextResponse.redirect(url);
  }

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.AUTH_SECRET) {
    const url = request.nextUrl.clone();
    url.pathname = "/registro";
    url.searchParams.set("next", pathname);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Inicia sesión. TraGo es 18+." }, { status: 401 });
    }
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.isAdult !== true) {
      const url = request.nextUrl.clone();
      url.pathname = "/registro";
      return NextResponse.redirect(url);
    }
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/nocturno",
    "/cuenta",
    "/panel",
    "/api/reportes/:path*",
    "/api/fuentes/:path*",
    "/api/panel/:path*",
  ],
};
