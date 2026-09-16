import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publishChainPromo } from "@/lib/queries";
import { VoteError } from "@/lib/presence";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  chainId: z.string().min(1),
  title: z.string().min(3).max(80),
  subtitle: z.string().max(120).optional(),
  kind: z.enum([
    "2x1",
    "botella",
    "happy-hour",
    "cover",
    "descuento",
    "combo",
    "comida",
    "cumple",
    "regalo",
  ]),
  terms: z.string().max(400).optional(),
  startsAt: z.string().min(8),
  endsAt: z.string().min(8),
  alcohol: z.boolean().optional(),
  isNocturno: z.boolean().optional(),
  isBirthday: z.boolean().optional(),
  branchIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isAdult) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const result = await publishChainPromo({
      userId: session.id,
      chainId: parsed.data.chainId,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle ?? "",
      kind: parsed.data.kind,
      terms: parsed.data.terms ?? "",
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      alcohol: parsed.data.alcohol,
      isNocturno: parsed.data.isNocturno,
      isBirthday: parsed.data.isBirthday,
      branchIds: parsed.data.branchIds ?? [],
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
