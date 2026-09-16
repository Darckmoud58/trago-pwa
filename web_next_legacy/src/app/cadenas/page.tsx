import Link from "next/link";
import { TIER_LABELS } from "@/lib/types";
import { ChainMark } from "@/components/ChainMark";
import { DemoNotice } from "@/components/DemoNotice";
import { getCatalog } from "@/lib/queries";

export default async function CadenasPage() {
  const { chains } = await getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl text-[var(--foam)]">Cadenas</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Cadenas reales. Perfil a perfil; el plan define anuncios, destaque y API.
      </p>
      <div className="mt-6">
        <DemoNotice />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {chains.map((chain) => (
          <Link
            key={chain.id}
            href={`/cadenas/${chain.slug}`}
            className="flex gap-4 border border-white/10 p-4 transition hover:border-[var(--copper)]/40"
          >
            <ChainMark chain={chain} />
            <div>
              <h2 className="font-display text-2xl text-[var(--foam)]">{chain.name}</h2>
              <p className="text-xs uppercase tracking-wider text-[var(--gold)]">
                {TIER_LABELS[chain.tier]}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{chain.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
