import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserPoints, listUserCoupons, redeemCoupon } from "@/lib/queries";
import { COUPON_COST, POINTS_REVIEW_NEAR, POINTS_VOTE } from "@/lib/rewards";
import { VoteError } from "@/lib/presence";
import { MAX_POINTS_PER_DAY } from "@/lib/security";
import {
  assertSameOrigin,
  clientIp,
  hitRateLimit,
  SecurityError,
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ points: 0, coupons: [], costs: { coupon: COUPON_COST } });
  const [points, coupons] = await Promise.all([
    getUserPoints(session.id),
    listUserCoupons(session.id),
  ]);
  return NextResponse.json({
    points,
    coupons: coupons.map((c) => ({
      code: c.code,
      label: c.label,
      costPoints: c.costPoints,
      createdAt: c.createdAt,
    })),
    costs: { coupon: COUPON_COST },
    earn: {
      vote: POINTS_VOTE,
      reviewNear: POINTS_REVIEW_NEAR,
      maxPerDay: MAX_POINTS_PER_DAY,
    },
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
    }
    const limited = hitRateLimit(`redeem:${session.id}:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Demasiados canjes. Espera ${limited.retryAfterSec}s.` },
        { status: 429 },
      );
    }
    const result = await redeemCoupon(session.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SecurityError || err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "No se pudo canjear" }, { status: 500 });
  }
}
