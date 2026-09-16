"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshSources() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/fuentes/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(data.error || "No se pudieron leer las páginas oficiales.");
      return;
    }
    const counts = Object.entries(data.sources ?? {})
      .map(([name, row]) => {
        const item = row as { count?: number };
        return `${name} ${item.count ?? 0}`;
      })
      .join(" · ");
    setNote(counts || "Listo.");
    router.refresh();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={refresh}
        className="border border-white/20 px-4 py-2 text-sm text-[var(--foam)] disabled:opacity-60"
      >
        {busy ? "Leyendo páginas…" : "Actualizar desde páginas oficiales"}
      </button>
      {note && <p className="mt-2 text-xs text-[var(--gold)]">{note}</p>}
    </div>
  );
}
