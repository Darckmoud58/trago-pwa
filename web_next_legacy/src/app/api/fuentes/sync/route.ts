import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { refreshOfficialSources } from "@/lib/ingest";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session?.isAdult) {
    return NextResponse.json({ error: "Inicia sesión. TraGo es 18+." }, { status: 401 });
  }
  try {
    const result = await refreshOfficialSources({ force: true });
    return NextResponse.json({ ok: true, sources: result?.sources ?? {} });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudieron leer las páginas";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
