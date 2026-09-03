import { NextResponse } from "next/server";
import { getChainBySlug } from "@/lib/catalog";
import { getCatalog } from "@/lib/queries";
import { crowdStatus, isWithinDates } from "@/lib/validity";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const chain = getChainBySlug(catalog, slug);

  if (!chain) {
    return NextResponse.json({ error: "Cadena no encontrada" }, { status: 404 });
  }

  if (!chain.hasApiAccess) {
    return NextResponse.json(
      { error: "Sin API. Plan Premium requerido." },
      { status: 403 },
    );
  }

  const sucursales = catalog.branches.filter((b) => b.chainId === chain.id);
  const data = catalog.promos
    .filter((p) => p.chainId === chain.id && isWithinDates(p))
    .map((promo) => ({
      ...promo,
      sucursales: catalog.branchPromos
        .filter((l) => l.promoId === promo.id)
        .map((link) => {
          const branch = sucursales.find((b) => b.id === link.branchId);
          return branch
            ? {
                id: branch.id,
                nombre: branch.name,
                direccion: branch.address,
                colonia: branch.colonia,
                geo: branch.geo,
                oficial: link.officialActive,
                vigencia: crowdStatus(link),
                reportes: { vigente: link.reportsVigente, caduco: link.reportsCaduco },
              }
            : null;
        })
        .filter(Boolean),
    }));

  return NextResponse.json({ cadena: chain.name, slug: chain.slug, promos: data });
}
