import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canOperatePanel, panelEmails } from "@/lib/panel-auth";
import { getCatalog } from "@/lib/queries";
import { getBranch } from "@/lib/catalog";
import { PanelLinks } from "@/components/PanelLinks";
import { RefreshSources } from "@/components/RefreshSources";
import { BirthdayPushSend } from "@/components/BirthdayPushSend";
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
  if (!canOperatePanel(user)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="font-display text-4xl text-[var(--foam)]">Panel de cadenas</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Esta cuenta no opera sucursales. Agrega el correo en{" "}
          <code className="text-[var(--gold)]">CHAIN_PANEL_EMAILS</code>
          {panelEmails().length === 0 ? " (aún vacío)." : "."}
        </p>
        <Link href="/cuenta" className="mt-6 inline-block text-sm text-[var(--gold)]">
          Volver a tu cuenta
        </Link>
      </div>
    );
  }

  const catalog = await getCatalog();
  const rows = catalog.branchPromos
    .map((link) => {
      const promo = promoById(catalog.promos, link.promoId);
      const branch = getBranch(catalog, link.branchId);
      if (!promo || !branch) return null;
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
        Marca qué sucursales participan. La calle sigue confirmando vigencia con GPS.
      </p>
      {!hasMongoUri() && (
        <p className="mt-4 text-sm text-[var(--copper)]">
          Sin Mongo los cambios no se guardan. Configura MONGODB_URI.
        </p>
      )}
      <RefreshSources />
      <BirthdayPushSend />
      <div className="mt-8">
        <PanelLinks rows={rows} />
      </div>
    </div>
  );
}
