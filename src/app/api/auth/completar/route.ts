import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ageFromBirthDate } from "@/lib/age";
import { birthDateIso } from "@/lib/night";
import { setSessionCookie, signSession } from "@/lib/auth";
import { assertAdult, parseBirthDate } from "@/lib/auth-validate";
import { PENDING_COOKIE, readPending } from "@/lib/google-oauth";
import {
  ensureIndexesAndSeed,
  findUserByEmail,
  findUserByGoogleId,
  insertUser,
} from "@/lib/queries";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confirm18: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const pending = await readPending(jar.get(PENDING_COOKIE)?.value ?? "");
    if (!pending) {
      return NextResponse.json(
        { error: "La sesión de Google expiró. Vuelve a entrar." },
        { status: 401 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Confirma fecha y mayoría de edad." }, { status: 400 });
    }

    const birth = parseBirthDate(parsed.data.birthDate);
    assertAdult(birth);
    await ensureIndexesAndSeed();

    const existing =
      (await findUserByGoogleId(pending.googleId)) || (await findUserByEmail(pending.email));
    if (existing) {
      return NextResponse.json({ error: "Esa cuenta ya existe. Entra de nuevo." }, { status: 409 });
    }

    const now = new Date();
    const id = await insertUser({
      email: pending.email,
      googleId: pending.googleId,
      profile: { name: pending.name, picture: pending.picture },
      age: {
        birthDate: birth,
        yearsAtSignup: ageFromBirthDate(birth, now),
        confirmed18: true,
        confirmedAt: now,
      },
      role: "user",
      createdAt: now,
    });

    const token = await signSession({
      id: String(id),
      email: pending.email,
      name: pending.name,
      isAdult: true,
      birthDate: birthDateIso(birth),
    });
    await setSessionCookie(token);
    jar.delete(PENDING_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo completar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
