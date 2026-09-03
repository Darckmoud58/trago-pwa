import { NextResponse } from "next/server";
import { setSessionCookie, signSession } from "@/lib/auth";
import { loginSchema, verifyPassword } from "@/lib/auth-validate";
import { ensureIndexesAndSeed, findUserByEmail } from "@/lib/queries";
import { isAdult } from "@/lib/age";
import { birthDateIso } from "@/lib/night";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo o contraseña inválidos." }, { status: 400 });
    }

    await ensureIndexesAndSeed();
    const user = await findUserByEmail(parsed.data.email);
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    if (!user.age?.confirmed18 || !isAdult(new Date(user.age.birthDate))) {
      return NextResponse.json(
        { error: "Esta cuenta no cumple la mayoría de edad (18+)." },
        { status: 403 },
      );
    }

    const token = await signSession({
      id: String(user._id),
      email: user.email,
      name: user.profile.name,
      isAdult: true,
      birthDate: birthDateIso(new Date(user.age.birthDate)),
    });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo entrar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
