"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Branch, BranchPromo, Promo } from "@/lib/types";

export function PanelLinks({
  rows,
}: {
  rows: { promo: Promo; branch: Branch; link: BranchPromo }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(row: { promo: Promo; branch: Branch; link: BranchPromo }) {
    const key = `${row.promo.id}:${row.branch.id}`;
    setBusy(key);
    setError(null);
    const res = await fetch("/api/panel/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promoId: row.promo.id,
        branchId: row.branch.id,
        officialActive: !row.link.officialActive,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-[var(--copper)]">{error}</p>}
      <ul className="divide-y divide-white/8 border border-white/10">
        {rows.map((row) => {
          const key = `${row.promo.id}:${row.branch.id}`;
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-lg text-[var(--foam)]">{row.promo.title}</p>
                <p className="text-sm text-[var(--muted)]">{row.branch.name}</p>
              </div>
              <button
                type="button"
                disabled={busy === key}
                onClick={() => toggle(row)}
                className={`px-3 py-1.5 text-xs ${
                  row.link.officialActive
                    ? "bg-[var(--copper)] text-[#1a1008]"
                    : "border border-white/15 text-[var(--muted)]"
                }`}
              >
                {row.link.officialActive ? "Participa" : "Fuera"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
