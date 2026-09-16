import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { EmpresaRegisterForm } from "@/components/EmpresaRegisterForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmpresaRegistroPage() {
  const user = await getSession();
  if (!user) redirect("/registro?next=/empresa/registro");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/cuenta" className="text-sm text-[var(--gold)]">
        ← Cuenta
      </Link>
      <h1 className="mt-4 font-display text-4xl text-[var(--foam)]">Registra tu cadena</h1>
      <p className="mt-3 text-[var(--muted)]">
        Publica ofertas en TraGo. La página también muestra promos de tu sitio oficial cuando
        las detectamos. Las opiniones de usuarios son el incentivo para que la promo se cumpla
        en caja.
      </p>
      <EmpresaRegisterForm />
    </div>
  );
}
