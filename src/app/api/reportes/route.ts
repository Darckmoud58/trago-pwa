import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserVote, saveVote } from "@/lib/queries";
import { VoteError, parseGeo, presenceMaxKm } from "@/lib/presence";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  promoId: z.string().min(1),
  branchId: z.string().min(1),
  stillValid: z.boolean(),
  lat: z.number(),
  lng: z.number(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdult) {
    return NextResponse.json({ error: "Inicia sesión. TraGo es 18+." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const geo = parseGeo(parsed.data.lat, parsed.data.lng);
  if (!geo) {
    return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
  }

  try {
    const link = await saveVote({
      userId: session.id,
      promoId: parsed.data.promoId,
      branchId: parsed.data.branchId,
      stillValid: parsed.data.stillValid,
      geo,
    });
    return NextResponse.json({
      reportsVigente: link?.reportsVigente ?? 0,
      reportsCaduco: link?.reportsCaduco ?? 0,
      mine: parsed.data.stillValid,
    });
  } catch (err) {
    if (err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ vote: null, maxKm: presenceMaxKm() });
  const { searchParams } = new URL(request.url);
  const promoId = searchParams.get("promoId");
  const branchId = searchParams.get("branchId");
  if (!promoId || !branchId) return NextResponse.json({ vote: null, maxKm: presenceMaxKm() });
  const doc = await getUserVote(session.id, promoId, branchId);
  return NextResponse.json({ vote: doc ? doc.stillValid : null, maxKm: presenceMaxKm() });
}
