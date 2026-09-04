"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isAdult,
  maxBirthDateForAccount,
  MIN_ACCOUNT_AGE,
  MIN_AGE,
  parseBirthDate,
} from "@/lib/age-client";

export function CompletarEdadForm({ name }: { name: string }) {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/promos";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [birthDate, setBirthDate] = useState("");

  const adult = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    return isAdult(parseBirthDate(birthDate));
  }, [birthDate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/completar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: form.get("birthDate"),
        confirmAge: form.get("confirmAge") === "on",
        confirm18: form.get("confirm18") === "on",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "No se pudo completar");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <p className="text-sm text-[var(--foam)]">Hola, {name}. Google no nos da tu fecha.</p>
      <label className="block text-sm text-[var(--muted)]">
        Fecha de nacimiento
        <input
          name="birthDate"
          type="date"
          required
          max={maxBirthDateForAccount()}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
        <input name="confirmAge" type="checkbox" required className="mt-1" />
        Confirmo que tengo al menos {MIN_ACCOUNT_AGE} años.
      </label>
      {adult === true && (
        <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
          <input name="confirm18" type="checkbox" required className="mt-1" />
          Confirmo mayoría de edad ({MIN_AGE}+) para alcohol.
        </label>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Entrar a TraGo"}
      </button>
    </form>
  );
}
