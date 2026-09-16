"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setPending(false);
      setError("Las contraseñas no coinciden.");
      return;
    }
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "No se pudo restablecer");
      return;
    }
    router.push("/entrar?reset=1");
    router.refresh();
  }

  if (!token) {
    return (
      <p className="text-sm text-[var(--copper)]">
        Falta el token.{" "}
        <Link href="/recuperar" className="text-[var(--gold)]">
          Solicita un enlace nuevo
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <label className="block text-sm text-[var(--muted)]">
        Nueva contraseña
        <input
          name="password"
          type="password"
          required
          minLength={10}
          maxLength={72}
          placeholder="Mín. 10, letra y número"
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Confirmar
        <input
          name="confirm"
          type="password"
          required
          minLength={10}
          maxLength={72}
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
