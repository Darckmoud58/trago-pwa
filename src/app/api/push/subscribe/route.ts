import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { savePushSubscription } from "@/lib/queries";
import { publicVapidKey, vapidConfigured } from "@/lib/push";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function GET() {
  return NextResponse.json({
    configured: vapidConfigured() && Boolean(publicVapidKey()),
    publicKey: publicVapidKey() || null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdult) {
    return NextResponse.json({ error: "Inicia sesión. TraGo es 18+." }, { status: 401 });
  }
  if (!vapidConfigured()) {
    return NextResponse.json(
      { error: "Push no configurado. Genera claves VAPID en el servidor." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  try {
    await savePushSubscription({
      userId: session.id,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se guardó la suscripción";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
