import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";
import { MIN_ACCOUNT_AGE, MIN_AGE } from "@/lib/age";

export default function RegistroPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--foam)]">Registro</h1>
      <p className="mt-2 text-[var(--muted)]">
        Desde {MIN_ACCOUNT_AGE} años: perfil joven (sin alcohol). Desde {MIN_AGE}+: catálogo completo.
        Pedimos fecha de nacimiento y confirmación.
      </p>
      <div className="mt-8">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="text-[var(--gold)]">
          Entrar
        </Link>
      </p>
    </div>
  );
}
