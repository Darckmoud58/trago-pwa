"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { maxBirthDateForAdult, MIN_AGE } from "@/lib/age";
import { GoogleButton } from "./GoogleButton";

export function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/promos";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        birthDate: form.get("birthDate"),
        confirm18: form.get("confirm18") === "on",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "No se pudo crear la cuenta");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <GoogleButton label="Registrarme con Google" />
      <p className="text-center text-xs uppercase tracking-[0.2em] text-[var(--muted)]">o con correo</p>
      <label className="block text-sm text-[var(--muted)]">
        Nombre
        <input
          name="name"
          required
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Correo
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Contraseña
        <input
          name="password"
          type="password"
          minLength={8}
          required
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Fecha de nacimiento
        <input
          name="birthDate"
          type="date"
          required
          max={maxBirthDateForAdult()}
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
        <input name="confirm18" type="checkbox" required className="mt-1" />
        Confirmo que soy mayor de {MIN_AGE} años. TraGo muestra promociones de alcohol.
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear cuenta 18+"}
      </button>
    </form>
  );
}
