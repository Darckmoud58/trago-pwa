import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAdult } from "@/lib/age";
import { sessionFromBirth, setSessionCookie, signSession } from "@/lib/auth";
import { ageFieldsForSignup, assertEligibleAccount, parseBirthDate } from "@/lib/auth-validate";
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
  confirmAge: z.literal(true),
  confirm18: z.boolean().optional(),
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
      return NextResponse.json({ error: "Confirma fecha y edad." }, { status: 400 });
    }

    const birth = parseBirthDate(parsed.data.birthDate);
    assertEligibleAccount(birth);
    if (isAdult(birth) && parsed.data.confirm18 !== true) {
      return NextResponse.json(
        { error: "Si eres 18+, confirma mayoría de edad." },
        { status: 400 },
      );
    }

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
      age: ageFieldsForSignup(birth, now),
      role: "user",
      createdAt: now,
    });

    const session = sessionFromBirth({
      id: String(id),
      email: pending.email,
      name: pending.name,
      birth,
    });
    const token = await signSession(session);
    await setSessionCookie(token);
    jar.delete(PENDING_COOKIE);
    return NextResponse.json({ ok: true, ageBand: session.ageBand });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo completar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
