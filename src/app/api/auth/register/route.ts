import { NextResponse } from "next/server";
import { ageFromBirthDate } from "@/lib/age";
import { birthDateIso } from "@/lib/night";
import { getSession, setSessionCookie, signSession } from "@/lib/auth";
import { assertAdult, hashPassword, parseBirthDate, registerSchema } from "@/lib/auth-validate";
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
    const { name, email, password, birthDate } = parsed.data;
    const birth = parseBirthDate(birthDate);
    assertAdult(birth);

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Ese correo ya está registrado." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const id = await insertUser({
      email: email.toLowerCase().trim(),
      passwordHash,
      profile: { name },
      age: {
        birthDate: birth,
        yearsAtSignup: ageFromBirthDate(birth, now),
        confirmed18: true,
        confirmedAt: now,
      },
      role: "user",
      points: 0,
      createdAt: now,
    });

    const token = await signSession({
      id: String(id),
      email: email.toLowerCase().trim(),
      name,
      isAdult: true,
      birthDate: birthDateIso(birth),
    });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SecurityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "No se pudo registrar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}
