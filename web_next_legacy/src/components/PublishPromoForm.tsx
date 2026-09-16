"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PromoKind } from "@/lib/types";
import { KIND_LABELS } from "@/lib/types";

export function PublishPromoForm({
  chainId,
  chainName,
}: {
  chainId: string;
  chainName: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [kind, setKind] = useState<PromoKind>("descuento");
  const [terms, setTerms] = useState("");
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/panel/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId,
        title,
        subtitle,
        kind,
        terms,
        startsAt: `${startsAt}T00:00:00.000Z`,
        endsAt: `${endsAt}T23:59:59.000Z`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.error === "string" ? data.error : "No se publicó.");
      return;
    }
    setNote(`Publicada: /promos/${data.slug}`);
    setTitle("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--gold)]">
        Nueva oferta · {chainName}
      </p>
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la promo"
        className="w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
      />
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Subtítulo"
        className="w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as PromoKind)}
        className="w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
      >
        {(Object.entries(KIND_LABELS) as [PromoKind, string][]).map(([k, label]) => (
          <option key={k} value={k} className="bg-[#08110e]">
            {label}
          </option>
        ))}
      </select>
      <div className="flex gap-3">
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="flex-1 border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
        />
        <input
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="flex-1 border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
        />
      </div>
      <textarea
        value={terms}
        onChange={(e) => setTerms(e.target.value)}
        placeholder="Términos"
        rows={2}
        className="w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
      />
      <button
        type="submit"
        disabled={busy}
        className="bg-[var(--copper)] px-4 py-2 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {busy ? "Publicando…" : "Publicar oferta"}
      </button>
      {note && <p className="text-xs text-[var(--gold)]">{note}</p>}
    </form>
  );
}
