import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/queries";
import { VoteError } from "@/lib/presence";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  SecurityError,
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z
  .object({
    token: z.string().min(20).max(200),
    password: z
      .string()
      .min(10)
      .max(72)
      .regex(/[A-Za-z]/)
      .regex(/[0-9]/),
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limited = hitRateLimit(`reset:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Contraseña inválida (mín. 10, letra y número)." },
        { status: 400 },
      );
    }
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SecurityError || err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo restablecer" }, { status: 500 });
  }
}
