import { NextResponse } from "next/server";
import {
  appOrigin,
  cookieBase,
  googleAuthUrl,
  googleConfigured,
  OAUTH_STATE_COOKIE,
  safeNext,
  signOAuthState,
} from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  if (!googleConfigured()) {
    const dest = new URL("/entrar", appOrigin(request));
    dest.searchParams.set("error", "google-config");
    dest.searchParams.set("next", next);
    return NextResponse.redirect(dest);
  }

  const state = await signOAuthState(next);
  const dest = googleAuthUrl(appOrigin(request), state);
  const res = NextResponse.redirect(dest);
  res.cookies.set(OAUTH_STATE_COOKIE, state, { ...cookieBase(), maxAge: 60 * 15 });
  return res;
}
