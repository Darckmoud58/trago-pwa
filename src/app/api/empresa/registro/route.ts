import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { registerChain } from "@/lib/queries";
import { VoteError } from "@/lib/presence";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(40),
  website: z.string().optional(),
  tagline: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
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
  try {
    const chain = await registerChain({
      user: session,
      name: parsed.data.name,
      slug: parsed.data.slug,
      website: parsed.data.website ?? "",
      tagline: parsed.data.tagline ?? "",
      description: parsed.data.description ?? "",
    });
    return NextResponse.json({ ok: true, chain: { id: chain.id, slug: chain.slug, name: chain.name } });
  } catch (err) {
    if (err instanceof VoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
