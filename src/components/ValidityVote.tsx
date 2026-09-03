"use client";

import { useEffect, useState } from "react";
import type { BranchPromo } from "@/lib/types";
import { crowdStatus, STATUS_LABELS } from "@/lib/validity";
import { useSession } from "./SessionProvider";
import Link from "next/link";

export function ValidityVote({
  promoId,
  branchId,
  link,
}: {
  promoId: string;
  branchId: string;
  link: BranchPromo;
}) {
  const user = useSession();
  const [vote, setVote] = useState<boolean | null>(null);
  const [yes, setYes] = useState(link.reportsVigente);
  const [no, setNo] = useState(link.reportsCaduco);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/reportes?promoId=${promoId}&branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.vote === "boolean") setVote(d.vote);
      })
      .catch(() => {});
  }, [user, promoId, branchId]);

  const liveLink: BranchPromo = { ...link, reportsVigente: yes, reportsCaduco: no };
  const status = crowdStatus(liveLink);

  async function report(stillValid: boolean) {
    if (!user || busy) return;
    setBusy(true);
    const res = await fetch("/api/reportes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoId, branchId, stillValid }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return;
    setYes(data.reportsVigente);
    setNo(data.reportsCaduco);
    setVote(data.mine);
  }

  return (
    <div className="mt-3 border-t border-white/8 pt-3">
      <p className="text-xs uppercase tracking-wider text-[var(--gold)]">{STATUS_LABELS[status]}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {yes} dicen que sigue · {no} dicen que ya no
      </p>
      {!user ? (
        <Link href="/registro" className="mt-2 inline-block text-xs text-[var(--gold)]">
          Entra con cuenta 18+ para reportar
        </Link>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => report(true)}
            className={`px-3 py-1.5 text-xs ${
              vote === true
                ? "bg-[var(--copper)] text-[#1a1008]"
                : "border border-white/15 text-[var(--foam)]"
            }`}
          >
            Sigue vigente
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => report(false)}
            className={`px-3 py-1.5 text-xs ${
              vote === false
                ? "bg-[var(--copper)] text-[#1a1008]"
                : "border border-white/15 text-[var(--foam)]"
            }`}
          >
            Ya no aplica
          </button>
        </div>
      )}
    </div>
  );
}
