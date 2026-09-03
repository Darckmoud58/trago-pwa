import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_OPTS, signSession } from "@/lib/auth";
import { isAdult } from "@/lib/age";
import { birthDateIso } from "@/lib/night";
import {
  appOrigin,
  cookieBase,
  exchangeGoogleCode,
  OAUTH_STATE_COOKIE,
  PENDING_COOKIE,
  readOAuthState,
  safeNext,
  signPending,
} from "@/lib/google-oauth";
import {
  ensureIndexesAndSeed,
  findUserByEmail,
  findUserByGoogleId,
  linkGoogleAccount,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function fail(request: NextRequest, message: string, next = "/promos") {
  const dest = new URL("/entrar", appOrigin(request));
  dest.searchParams.set("error", message);
  dest.searchParams.set("next", next);
  const res = NextResponse.redirect(dest);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || cookieState !== state) {
    return fail(request, "google-state");
  }

  let next = "/promos";
  try {
    next = (await readOAuthState(state)).next;
  } catch {
    return fail(request, "google-state");
  }

  try {
    await ensureIndexesAndSeed();
    const google = await exchangeGoogleCode(appOrigin(request), code);
    const existing =
      (await findUserByGoogleId(google.googleId)) || (await findUserByEmail(google.email));

    if (existing?.age?.confirmed18 && isAdult(new Date(existing.age.birthDate))) {
      if (!existing.googleId) {
        await linkGoogleAccount(String(existing._id), google.googleId, google.picture);
      }
      const token = await signSession({
        id: String(existing._id),
        email: existing.email,
        name: existing.profile.name,
        isAdult: true,
        birthDate: birthDateIso(new Date(existing.age.birthDate)),
      });
      const dest = new URL(safeNext(next), appOrigin(request));
      const res = NextResponse.redirect(dest);
      res.cookies.delete(OAUTH_STATE_COOKIE);
      res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
      return res;
    }

    const pending = await signPending(google);
    const dest = new URL("/completar", appOrigin(request));
    dest.searchParams.set("next", next);
    const res = NextResponse.redirect(dest);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    res.cookies.set(PENDING_COOKIE, pending, { ...cookieBase(), maxAge: 60 * 30 });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "google-fail";
    return fail(request, message, next);
  }
}
