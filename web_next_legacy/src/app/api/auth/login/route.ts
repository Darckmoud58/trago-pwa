import { NextResponse } from "next/server";
import {
  clearLoginFailures,
  createTwoFactorChallenge,
  ensureIndexesAndSeed,
  findUserByEmail,
  assertLoginAllowed,
  recordLoginFailure,
} from "@/lib/queries";
import { loginSchema, verifyPassword } from "@/lib/auth-validate";
import { canOpenAccount } from "@/lib/age";
import {
  sessionFromBirth,
  setSessionCookie,
  setTwoFactorPendingCookie,
  signSession,
  signTwoFactorPending,
} from "@/lib/auth";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  SecurityError,
} from "@/lib/security";
import { VoteError } from "@/lib/presence";
import { allowDevMailPreview, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIp(request);
    const burst = hitRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!burst.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${burst.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo o contraseña inválidos." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const lockKey = `login:${email}`;
    await ensureIndexesAndSeed();
    await assertLoginAllowed(lockKey);

    const emailBurst = hitRateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
    if (!emailBurst.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${emailBurst.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const user = await findUserByEmail(email);
    if (!user?.passwordHash) {
      await recordLoginFailure(lockKey);
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      await recordLoginFailure(lockKey);
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const birth = new Date(user.age.birthDate);
    if (!user.age?.birthDate || !canOpenAccount(birth)) {
      return NextResponse.json(
        { error: "Esta cuenta no cumple la edad mínima (13+)." },
        { status: 403 },
      );
    }

    await clearLoginFailures(lockKey);
    const userId = String(user._id);

    if (user.twoFactorEmail) {
      const challenge = await createTwoFactorChallenge(userId);
      await sendMail({
        to: user.email,
        subject: "Tu código TraGo (2 pasos)",
        text: `Hola ${user.profile.name},\n\nTu código es: ${challenge.code}\nVale 10 minutos.\n\nSi no fuiste tú, ignora este correo.`,
        html: `<p>Hola ${user.profile.name},</p><p>Tu código TraGo es <strong style="font-size:1.4em">${challenge.code}</strong></p><p>Vale 10 minutos.</p>`,
      });
      const pending = await signTwoFactorPending({
        userId,
        challengeId: challenge.challengeId,
        email: user.email,
      });
      await setTwoFactorPendingCookie(pending);
      return NextResponse.json({
        ok: true,
        needs2fa: true,
        ...(allowDevMailPreview() ? { devCode: challenge.code } : {}),
      });
    }

    const session = sessionFromBirth({
      id: userId,
      email: user.email,
      name: user.profile.name,
      birth,
    });
    const token = await signSession(session);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, needs2fa: false, ageBand: session.ageBand });
  } catch (err) {
    if (err instanceof SecurityError || err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo entrar" }, { status: 500 });
  }
}
