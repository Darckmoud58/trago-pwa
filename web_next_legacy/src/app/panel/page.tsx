import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canOperatePanel, isPanelEmail, panelEmails } from "@/lib/panel-auth";
import { chainsOwnedBy, getCatalog } from "@/lib/queries";
import { getBranch } from "@/lib/catalog";
import { PanelLinks } from "@/components/PanelLinks";
import { RefreshSources } from "@/components/RefreshSources";
import { BirthdayPushSend } from "@/components/BirthdayPushSend";
import { PublishPromoForm } from "@/components/PublishPromoForm";
import { hasMongoUri } from "@/lib/mongo";
import Link from "next/link";
import type { Promo } from "@/lib/types";

export const dynamic = "force-dynamic";

function promoById(promos: Promo[], id: string) {
  return promos.find((p) => p.id === id);
}

export default async function PanelPage() {
  const user = await getSession();
  if (!user) redirect("/entrar?next=/panel");
  if (!(await canOperatePanel(user))) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="font-display text-4xl text-[var(--foam)]">Panel de cadenas</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Registra tu cadena para publicar ofertas, o pide que te agreguen en{" "}
          <code className="text-[var(--gold)]">CHAIN_PANEL_EMAILS</code>
          {panelEmails().length === 0 ? " (aún vacío)." : "."}
        </p>
        <Link href="/empresa/registro" className="mt-6 inline-block text-sm text-[var(--gold)]">
          Ir a registro de empresa
        </Link>
      </div>
    );
  }

  const [catalog, owned] = await Promise.all([getCatalog(), chainsOwnedBy(user.id)]);
  const ownedIds = new Set(owned.map((c) => c._id));
  const rows = catalog.branchPromos
    .map((link) => {
      const promo = promoById(catalog.promos, link.promoId);
      const branch = getBranch(catalog, link.branchId);
      if (!promo || !branch) return null;
      if (ownedIds.size > 0 && !ownedIds.has(promo.chainId) && !isPanelEmail(user)) {
        return null;
      }
      return { promo, branch, link };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/cuenta" className="text-sm text-[var(--gold)]">
        ← Cuenta
      </Link>
      <h1 className="mt-4 font-display text-4xl text-[var(--foam)]">Panel de cadenas</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Publica ofertas propias y marca sucursales. TraGo también lee páginas oficiales. La
        calle confirma vigencia y reputación.
      </p>
      {!hasMongoUri() && (
        <p className="mt-4 text-sm text-[var(--copper)]">
          Sin Mongo los cambios no se guardan. Configura MONGODB_URI.
        </p>
      )}
      <RefreshSources />
      {isPanelEmail(user) && <BirthdayPushSend />}
      {owned.map((chain) => (
        <PublishPromoForm key={chain._id} chainId={chain._id} chainName={chain.name} />
      ))}
      <div className="mt-8">
        <h2 className="font-display text-2xl text-[var(--foam)]">Sucursales participantes</h2>
        <PanelLinks rows={rows} />
      </div>
    </div>
  );
}
