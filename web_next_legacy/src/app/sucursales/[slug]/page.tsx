import Link from "next/link";
import { notFound } from "next/navigation";
import { PromoCard } from "@/components/PromoCard";
import { getBranchBySlug, getChain, promosForBranch } from "@/lib/catalog";
import { getCatalog } from "@/lib/queries";
import { VENUE_LABELS } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SucursalPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const branch = getBranchBySlug(catalog, slug);
  if (!branch) notFound();
  const chain = getChain(catalog, branch.chainId);
  const rows = promosForBranch(catalog, branch.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={chain ? `/cadenas/${chain.slug}` : "/cadenas"} className="text-sm text-[var(--gold)]">
        ← {chain?.name ?? "Cadenas"}
      </Link>
      <div className="relative mt-6 aspect-[16/8] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branch.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
        {VENUE_LABELS[branch.kind]} · {branch.colonia}
      </p>
      <h1 className="mt-2 font-display text-4xl text-[var(--foam)]">{branch.name}</h1>
      <p className="mt-2 text-[var(--muted)]">
        {branch.address} · {branch.hours}
      </p>

      <h2 className="mt-10 font-display text-2xl text-[var(--foam)]">Promos en esta sucursal</h2>
      <div className="mt-4 grid gap-5">
        {rows.map(({ promo, link }) => (
          <PromoCard key={promo.id} promo={promo} branch={branch} link={link} />
        ))}
      </div>
    </div>
  );
}
