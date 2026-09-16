import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getTwoFactorEnabled,
  setTwoFactorEmail,
  findUserById,
} from "@/lib/queries";
import { verifyPassword } from "@/lib/auth-validate";
import { VoteError } from "@/lib/presence";
import { assertSameOrigin, SecurityError } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ enabled: false }, { status: 401 });
  const enabled = await getTwoFactorEnabled(session.id);
  return NextResponse.json({ enabled });
}

const schema = z
  .object({
    enabled: z.boolean(),
    password: z.string().min(1).max(72),
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const user = await findUserById(session.id);
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "La 2FA por correo requiere cuenta con contraseña (no solo Google)." },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    const enabled = await setTwoFactorEmail(session.id, parsed.data.enabled);
    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    if (err instanceof SecurityError || err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }
}
