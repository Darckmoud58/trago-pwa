import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listReviewsForPromo, saveReview } from "@/lib/queries";
import { VoteError, parseGeo } from "@/lib/presence";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postSchema = z.object({
  promoId: z.string().min(1),
  branchId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(8).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function GET(request: Request) {
  const promoId = new URL(request.url).searchParams.get("promoId");
  if (!promoId) return NextResponse.json({ reviews: [] });
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
  const session = await getSession();
  if (!session?.isAdult) {
    return NextResponse.json({ error: "Inicia sesión. TraGo es 18+." }, { status: 401 });
  }
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos (rating 1–5 y texto corto)." }, { status: 400 });
  }
  const geo =
    parsed.data.lat != null && parsed.data.lng != null
      ? parseGeo(parsed.data.lat, parsed.data.lng)
      : null;
  try {
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
    if (err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
