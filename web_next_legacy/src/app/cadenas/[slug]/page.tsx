import Link from "next/link";
import { notFound } from "next/navigation";
import { AdBanner } from "@/components/AdBanner";
import { PromoCard } from "@/components/PromoCard";
import { ChainMark } from "@/components/ChainMark";
import { DemoNotice } from "@/components/DemoNotice";
import { getChainBySlug } from "@/lib/catalog";
import { getCatalog } from "@/lib/queries";
import { TIER_LABELS, VENUE_LABELS } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CadenaPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const chain = getChainBySlug(catalog, slug);
  if (!chain) notFound();

  const sucursales = catalog.branches.filter((b) => b.chainId === chain.id);
  const chainPromos = catalog.promos.filter((p) => p.chainId === chain.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/cadenas" className="text-sm text-[var(--gold)]">
        ← Cadenas
      </Link>
      <div className="mt-6 flex gap-5">
        <ChainMark chain={chain} />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
            {TIER_LABELS[chain.tier]}
          </p>
          <h1 className="font-display text-4xl text-[var(--foam)]">{chain.name}</h1>
          <p className="mt-2 max-w-xl text-[var(--muted)]">{chain.description}</p>
          {chain.website && (
            <p className="mt-2 text-sm">
              <a
                href={chain.website}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--gold)]"
              >
                Página oficial
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <DemoNotice />
      </div>

      {chain.showAds && (
        <div className="mt-8">
          <AdBanner />
        </div>
      )}

      <h2 className="mt-12 font-display text-2xl text-[var(--foam)]">Promos</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {chainPromos.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl text-[var(--foam)]">Sucursales</h2>
      <ul className="mt-4 divide-y divide-white/8 border border-white/10">
        {sucursales.map((branch) => (
          <li key={branch.id}>
            <Link href={`/sucursales/${branch.slug}`} className="block p-4 hover:bg-white/[0.03]">
              <p className="font-display text-xl text-[var(--foam)]">{branch.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {VENUE_LABELS[branch.kind]} · {branch.colonia} · {branch.address}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {chain.hasApiAccess && (
        <section className="mt-10 border border-[var(--copper)]/30 bg-[#0e1a16] p-5">
          <p className="font-display text-xl text-[var(--foam)]">API Premium</p>
          <code className="mt-2 block text-sm text-[var(--gold)]">
            GET /api/cadenas/{chain.slug}/promos
          </code>
        </section>
      )}
    </div>
  );
}
