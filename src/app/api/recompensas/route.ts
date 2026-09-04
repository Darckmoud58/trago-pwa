import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserPoints, listUserCoupons, redeemCoupon } from "@/lib/queries";
import { COUPON_COST, POINTS_REVIEW_NEAR, POINTS_VOTE } from "@/lib/rewards";
import { VoteError } from "@/lib/presence";

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
    earn: { vote: POINTS_VOTE, reviewNear: POINTS_REVIEW_NEAR },
  });
}

export async function POST() {
  const session = await getSession();
  if (!session?.isAdult) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }
  try {
    const result = await redeemCoupon(session.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
