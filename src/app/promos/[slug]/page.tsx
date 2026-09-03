import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchPromoList } from "@/components/BranchPromoList";
import { AdBanner } from "@/components/AdBanner";
import { DemoNotice } from "@/components/DemoNotice";
import { ChainMark } from "@/components/ChainMark";
import { branchesForPromo, getChain, getPromoBySlug } from "@/lib/catalog";
import { getCatalog } from "@/lib/queries";
import { KIND_LABELS } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PromoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const promo = getPromoBySlug(catalog, slug);
  if (!promo) notFound();

  const chain = getChain(catalog, promo.chainId);
  const rows = branchesForPromo(catalog, promo.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/promos" className="text-sm text-[var(--gold)]">
        ← Promos
      </Link>

      <div className="mt-6">
        <DemoNotice />
      </div>

      <div className="relative mt-6 aspect-[16/8] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={promo.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="mt-6 flex items-center gap-3">
        {chain && <ChainMark chain={chain} />}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
            {KIND_LABELS[promo.kind]}
            {promo.sourceUrl ? " · página oficial" : promo.isDemo ? " · folio demo" : ""}
          </p>
          <p className="font-display text-2xl text-[var(--foam)]">{chain?.name}</p>
        </div>
      </div>
      <h1 className="mt-4 font-display text-4xl text-[var(--foam)]">{promo.title}</h1>
      <p className="mt-2 text-lg text-[var(--muted)]">{promo.subtitle}</p>
      <p className="mt-4 text-sm text-[var(--muted)]">{promo.terms}</p>
      {promo.sourceUrl && (
        <p className="mt-3 text-sm">
          <a
            href={promo.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--gold)]"
          >
            {promo.sourceLabel ?? "Ver en la página oficial"}
          </a>
        </p>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]">
        {new Date(promo.startsAt).toLocaleDateString("es-MX")} —{" "}
        {new Date(promo.endsAt).toLocaleDateString("es-MX")}
      </p>

      <h2 className="mt-10 font-display text-2xl text-[var(--foam)]">En estas tiendas</h2>
      <p className="mt-2 mb-4 text-sm text-[var(--muted)]">
        Nombre real de sucursal. Reporta si el folio (demo) todavía aplicaría en ese local.
      </p>
      <BranchPromoList promo={promo} rows={rows} />

      {chain?.showAds && (
        <div className="mt-10">
          <AdBanner />
        </div>
      )}
    </div>
  );
}
