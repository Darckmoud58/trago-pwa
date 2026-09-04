"use client";

import { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    setDevUrl(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "No se pudo enviar");
      return;
    }
    setMessage(data.message || "Revisa tu correo.");
    if (typeof data.devResetUrl === "string") setDevUrl(data.devResetUrl);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <label className="block text-sm text-[var(--muted)]">
        Correo de tu cuenta
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-[var(--gold)]">{message}</p>}
      {devUrl && (
        <p className="break-all border border-[var(--copper)]/40 px-3 py-2 text-xs text-[var(--foam)]">
          Dev (sin Resend):{" "}
          <Link href={devUrl} className="text-[var(--gold)] underline">
            abrir enlace de reset
          </Link>
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/entrar" className="text-[var(--gold)]">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}
