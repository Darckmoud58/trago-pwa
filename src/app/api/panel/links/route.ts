import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canOperatePanel } from "@/lib/panel-auth";
import { hasMongoUri } from "@/lib/mongo";
import { setOfficialActive } from "@/lib/queries";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  promoId: z.string().min(1),
  branchId: z.string().min(1),
  officialActive: z.boolean(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!(await canOperatePanel(session))) {
    return NextResponse.json({ error: "Sin permiso de operador." }, { status: 403 });
  }
  if (!hasMongoUri()) {
    return NextResponse.json({ error: "MongoDB requerido para el panel." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const link = await setOfficialActive(parsed.data);
  return NextResponse.json({ officialActive: link?.officialActive ?? parsed.data.officialActive });
}
