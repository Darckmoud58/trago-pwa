import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function RecuperarPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--foam)]">Recuperar contraseña</h1>
      <p className="mt-2 text-[var(--muted)]">
        Te enviamos un enlace de un solo uso (30 minutos). Si no tienes Resend configurado, en
        local verás el enlace en pantalla.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        <Link href="/entrar" className="text-[var(--gold)]">
          Volver a entrar
        </Link>
      </p>
    </div>
  );
}
