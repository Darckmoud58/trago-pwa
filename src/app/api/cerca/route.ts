import { NextResponse } from "next/server";
import { parseGeo } from "@/lib/presence";
import { queryNearbyPromos } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { canViewPromo } from "@/lib/audience";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const geo = parseGeo(searchParams.get("lat"), searchParams.get("lng"));
  if (!geo) {
    return NextResponse.json({ error: "lat y lng requeridos" }, { status: 400 });
  }

  const maxKmRaw = Number(searchParams.get("maxKm") ?? 40);
  const maxKm = Number.isFinite(maxKmRaw) && maxKmRaw > 0 ? Math.min(maxKmRaw, 80) : 40;
  const nocturno = searchParams.get("nocturno") === "1";
  const birthday = searchParams.get("birthday") === "1";

  const session = await getSession().catch(() => null);
  const result = await queryNearbyPromos(geo, { maxKm, nocturno, birthday });
  const rows = result.rows.filter(({ promo }) => canViewPromo(promo, session));

  return NextResponse.json({
    source: result.source,
    count: rows.length,
    rows: rows.map(({ promo, nearest }) => ({
      promo,
      nearest: {
        km: nearest.km,
        branch: nearest.branch,
        link: nearest.link,
        status: nearest.status,
      },
    })),
  });
}
