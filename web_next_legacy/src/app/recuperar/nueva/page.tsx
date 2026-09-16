import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function RecuperarNuevaPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--foam)]">Nueva contraseña</h1>
      <p className="mt-2 text-[var(--muted)]">Elige una clave fuerte (mín. 10, letra y número).</p>
      <div className="mt-8">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        <Link href="/entrar" className="text-[var(--gold)]">
          Entrar
        </Link>
      </p>
    </div>
  );
}
