import { NextResponse } from "next/server";
import { ageFromBirthDate, isAdult } from "@/lib/age";
import { sessionFromBirth, setSessionCookie, signSession } from "@/lib/auth";
import {
  ageFieldsForSignup,
  assertEligibleAccount,
  hashPassword,
  parseBirthDate,
  registerSchema,
} from "@/lib/auth-validate";
import { ensureIndexesAndSeed, findUserByEmail, insertUser } from "@/lib/queries";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  REGISTER_MAX_PER_HOUR,
  SecurityError,
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIp(request);
    const limited = hitRateLimit(`register:ip:${ip}`, REGISTER_MAX_PER_HOUR, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Demasiados registros desde esta red. Espera ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const json = await request.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await ensureIndexesAndSeed();
    const { name, email, password, birthDate, confirm18 } = parsed.data;
    const birth = parseBirthDate(birthDate);
    assertEligibleAccount(birth);

    const adult = isAdult(birth);
    if (adult && confirm18 !== true) {
      return NextResponse.json(
        { error: "Si eres 18+, confirma la mayoría de edad para ver alcohol." },
        { status: 400 },
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Ese correo ya está registrado." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const age = ageFieldsForSignup(birth, now);
    const id = await insertUser({
      email: email.toLowerCase().trim(),
      passwordHash,
      profile: { name },
      age,
      role: "user",
      points: 0,
      createdAt: now,
    });

    const session = sessionFromBirth({
      id: String(id),
      email: email.toLowerCase().trim(),
      name,
      birth,
    });
    const token = await signSession(session);
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      ageBand: session.ageBand,
      years: ageFromBirthDate(birth, now),
    });
  } catch (err) {
    if (err instanceof SecurityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "No se pudo registrar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const { getSession } = await import("@/lib/auth");
  const user = await getSession();
  return NextResponse.json({ user });
}
