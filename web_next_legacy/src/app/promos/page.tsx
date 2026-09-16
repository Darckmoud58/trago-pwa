import { PromoCard } from "@/components/PromoCard";
import { GeoChip } from "@/components/GeoChip";
import { DemoNotice } from "@/components/DemoNotice";
import { getCatalog } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { filterPromosForViewer } from "@/lib/audience";
import { KIND_LABELS, type PromoKind } from "@/lib/types";
import { isWithinDates } from "@/lib/validity";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ tipo?: string }>;
}

export default async function PromosPage({ searchParams }: PageProps) {
  const { tipo } = await searchParams;
  const [catalog, user] = await Promise.all([getCatalog(), getSession().catch(() => null)]);
  const promos = filterPromosForViewer(catalog.promos, user);
  const list = promos.filter((p) => isWithinDates(p)).filter((p) => (tipo ? p.kind === tipo : true));
  const kinds = Object.entries(KIND_LABELS) as [PromoKind, string][];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-[var(--foam)]">Promociones vigentes</h1>
          <p className="mt-2 max-w-xl text-[var(--muted)]">
            {user?.isAdult
              ? "Catálogo completo, incluido alcohol."
              : user
                ? "Perfil joven: sin alcohol. Comida, café y coleccionables."
                : "Sin cuenta ves lo general. Entra para personalizar por edad."}{" "}
            Filtra por tipo y entra para ver en qué sucursales sigue viva.
          </p>
        </div>
        <GeoChip />
      </div>
      <div className="mt-6">
        <DemoNotice />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/promos"
          className={`px-3 py-1.5 text-sm ${!tipo ? "bg-[var(--copper)] text-[#1a1008]" : "border border-white/15 text-[var(--muted)]"}`}
        >
          Todas
        </Link>
        {kinds.map(([key, label]) => (
          <Link
            key={key}
            href={`/promos?tipo=${key}`}
            className={`px-3 py-1.5 text-sm ${tipo === key ? "bg-[var(--copper)] text-[#1a1008]" : "border border-white/15 text-[var(--muted)]"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>
    </div>
  );
}
