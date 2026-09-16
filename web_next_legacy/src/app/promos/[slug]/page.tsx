import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchPromoList } from "@/components/BranchPromoList";
import { AdBanner } from "@/components/AdBanner";
import { DemoNotice } from "@/components/DemoNotice";
import { ChainMark } from "@/components/ChainMark";
import { ExperienceReviews } from "@/components/ExperienceReviews";
import { branchesForPromo, getChain, getPromoBySlug } from "@/lib/catalog";
import { chainReputation, getCatalog } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { canViewPromo } from "@/lib/audience";
import { KIND_LABELS } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PromoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [catalog, user] = await Promise.all([getCatalog(), getSession().catch(() => null)]);
  const promo = getPromoBySlug(catalog, slug);
  if (!promo || !canViewPromo(promo, user)) notFound();

  const chain = getChain(catalog, promo.chainId);
  const rows = branchesForPromo(catalog, promo.id);
  const originLabel =
    promo.origin === "official" || promo.sourceUrl
      ? "página oficial"
      : promo.origin === "chain"
        ? "publicada por la cadena"
        : promo.isDemo
          ? "folio demo"
          : "";
  const reputation = chain ? await chainReputation(chain.id) : { avg: null, count: 0 };

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
            {originLabel ? ` · ${originLabel}` : ""}
          </p>
          <p className="font-display text-2xl text-[var(--foam)]">{chain?.name}</p>
          {reputation.count > 0 && reputation.avg != null && (
            <p className="text-xs text-[var(--muted)]">
              Reputación TraGo: {reputation.avg} ★ · {reputation.count} opiniones
            </p>
          )}
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
        Reporta vigencia con GPS. Opina y gana puntos canjeables por cupones.
      </p>
      <BranchPromoList promo={promo} rows={rows} />

      <ExperienceReviews promoId={promo.id} branches={rows.map((r) => r.branch)} />

      {chain?.showAds && (
        <div className="mt-10">
          <AdBanner />
        </div>
      )}
    </div>
  );
}
