import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { BirthdayPushButton } from "@/components/BirthdayPushButton";
import { RewardsPanel } from "@/components/RewardsPanel";
import { canOperatePanel } from "@/lib/panel-auth";
import { isBirthdayToday } from "@/lib/night";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const user = await getSession();
  if (!user) redirect("/entrar?next=/cuenta");
  const panel = await canOperatePanel(user);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--foam)]">Tu cuenta</h1>
      <p className="mt-4 text-[var(--foam)]">{user.name}</p>
      <p className="text-sm text-[var(--muted)]">{user.email}</p>
      <p className="mt-4 text-sm text-[var(--gold)]">Mayoría de edad confirmada (18+).</p>
      {user.birthDate && isBirthdayToday(user.birthDate) && (
        <p className="mt-3 text-sm text-[var(--foam)]">
          Hoy es tu cumpleaños.{" "}
          <Link href="/cumple" className="text-[var(--gold)]">
            Ver qué te regalan cerca
          </Link>
          .
        </p>
      )}
      <BirthdayPushButton />
      <RewardsPanel />
      <div className="mt-8 space-y-3 text-sm">
        {panel ? (
          <p>
            <Link href="/panel" className="text-[var(--gold)]">
              Panel de cadenas
            </Link>
          </p>
        ) : (
          <p>
            <Link href="/empresa/registro" className="text-[var(--gold)]">
              Registrar mi cadena / negocio
            </Link>
          </p>
        )}
      </div>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  );
}
