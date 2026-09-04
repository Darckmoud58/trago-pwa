import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearTwoFactorPendingCookie,
  getTwoFactorPendingCookie,
  setSessionCookie,
  signSession,
} from "@/lib/auth";
import { findUserById, verifyTwoFactorChallenge } from "@/lib/queries";
import { isAdult } from "@/lib/age";
import { birthDateIso } from "@/lib/night";
import { VoteError } from "@/lib/presence";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  SecurityError,
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limited = hitRateLimit(`2fa:${clientIp(request)}`, 20, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const pending = await getTwoFactorPendingCookie();
    if (!pending) {
      return NextResponse.json(
        { error: "Sesión 2FA expirada. Vuelve a iniciar sesión." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Código de 6 dígitos requerido." }, { status: 400 });
    }

    const verified = await verifyTwoFactorChallenge(pending.challengeId, parsed.data.code);
    if (verified.userId !== pending.userId) {
      return NextResponse.json({ error: "Desafío inválido." }, { status: 401 });
    }

    const user = await findUserById(verified.userId);
    if (!user?.age?.confirmed18 || !isAdult(new Date(user.age.birthDate))) {
      return NextResponse.json({ error: "Cuenta no válida." }, { status: 403 });
    }

    const token = await signSession({
      id: String(user._id),
      email: user.email,
      name: user.profile.name,
      isAdult: true,
      birthDate: birthDateIso(new Date(user.age.birthDate)),
    });
    await clearTwoFactorPendingCookie();
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SecurityError || err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo verificar" }, { status: 500 });
  }
}
