import { NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordReset, ensureIndexesAndSeed } from "@/lib/queries";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  SecurityError,
} from "@/lib/security";
import { allowDevMailPreview, appBaseUrl, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().email().max(120) }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIp(request);
    const limited = hitRateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Espera ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const parsed = schema.safeParse(await request.json());
    // Respuesta genérica siempre (no filtrar correos).
    const generic = {
      ok: true,
      message: "Si el correo existe, enviamos un enlace para restablecer la contraseña.",
    };
    if (!parsed.success) return NextResponse.json(generic);

    await ensureIndexesAndSeed();
    const result = await createPasswordReset(parsed.data.email);
    if (!result.created) return NextResponse.json(generic);

    const link = `${appBaseUrl()}/recuperar/nueva?token=${encodeURIComponent(result.token)}`;
    await sendMail({
      to: result.email,
      subject: "Recupera tu contraseña — TraGo",
      text: `Hola ${result.name},\n\nRestablece tu contraseña aquí (30 min):\n${link}\n\nSi no lo pediste, ignora este mensaje.`,
      html: `<p>Hola ${result.name},</p><p><a href="${link}">Restablecer contraseña</a></p><p>El enlace vale 30 minutos.</p>`,
    });

    return NextResponse.json({
      ...generic,
      ...(allowDevMailPreview() ? { devResetUrl: link } : {}),
    });
  } catch (err) {
    if (err instanceof SecurityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
  }
}
