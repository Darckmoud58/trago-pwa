import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listReviewsForPromo, saveReview, getCatalog } from "@/lib/queries";
import { canViewPromo } from "@/lib/audience";
import { VoteError, parseGeo } from "@/lib/presence";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  SecurityError,
} from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postSchema = z
  .object({
    promoId: z.string().min(1).max(80),
    branchId: z.string().min(1).max(80),
    rating: z.number().int().min(1).max(5),
    text: z.string().min(12).max(500),
    lat: z.number(),
    lng: z.number(),
  })
  .strict();

export async function GET(request: Request) {
  const promoId = new URL(request.url).searchParams.get("promoId");
  if (!promoId || promoId.length > 80) return NextResponse.json({ reviews: [] });
  const reviews = await listReviewsForPromo(promoId);
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      userName: r.userName,
      rating: r.rating,
      text: r.text,
      nearStore: r.nearStore,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Inicia sesión para opinar." }, { status: 401 });
    }
    const ip = clientIp(request);
    const limited = hitRateLimit(`review:${session.id}:${ip}`, 8, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Demasiadas opiniones. Espera ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos (GPS + rating 1–5 + texto ≥12)." },
        { status: 400 },
      );
    }
    const catalog = await getCatalog();
    const promo = catalog.promos.find((p) => p.id === parsed.data.promoId);
    if (!promo || !canViewPromo(promo, session)) {
      return NextResponse.json(
        { error: "No puedes opinar sobre esta promo con tu perfil de edad." },
        { status: 403 },
      );
    }
    const geo = parseGeo(parsed.data.lat, parsed.data.lng);
    if (!geo) {
      return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
    }
    const result = await saveReview({
      userId: session.id,
      userName: session.name,
      promoId: parsed.data.promoId,
      branchId: parsed.data.branchId,
      rating: parsed.data.rating,
      text: parsed.data.text,
      geo,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SecurityError || err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}
