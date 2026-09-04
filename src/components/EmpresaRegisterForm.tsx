"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EmpresaRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/empresa/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, website, tagline }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "No se pudo registrar.");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-lg space-y-4">
      <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
        Nombre de la cadena
        <input
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) {
              setSlug(
                e.target.value
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/\p{Diacritic}/gu, "")
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, ""),
              );
            }
          }}
          className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
        Slug (URL)
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
        Sitio web
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
          className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
        Tagline
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-[var(--foam)]"
        />
      </label>
      {error && <p className="text-sm text-[var(--copper)]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="bg-[var(--copper)] px-5 py-2.5 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {busy ? "Registrando…" : "Registrar mi cadena"}
      </button>
    </form>
  );
}
