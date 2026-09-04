import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function EntrarPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--foam)]">Entrar</h1>
      <p className="mt-2 text-[var(--muted)]">
        Cuenta joven o adulta. Los votos y puntos quedan en tu perfil.
      </p>
      <div className="mt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        ¿Primera vez?{" "}
        <Link href="/registro" className="text-[var(--gold)]">
          Crear cuenta
        </Link>
        {" · "}
        <Link href="/recuperar" className="text-[var(--gold)]">
          Recuperar contraseña
        </Link>
      </p>
    </div>
  );
}
