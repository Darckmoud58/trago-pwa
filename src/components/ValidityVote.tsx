"use client";

import { useEffect, useState } from "react";
import type { BranchPromo } from "@/lib/types";
import { crowdStatus, STATUS_LABELS } from "@/lib/validity";
import { formatKm, haversineKm } from "@/lib/geo";
import { presenceMaxKm, VOTE_WINDOW_DAYS } from "@/lib/presence";
import { useSession } from "./SessionProvider";
import { useGeo } from "./GeoProvider";
import Link from "next/link";

export function ValidityVote({
  promoId,
  branchId,
  link,
  branchGeo,
}: {
  promoId: string;
  branchId: string;
  link: BranchPromo;
  branchGeo: { lat: number; lng: number };
}) {
  const user = useSession();
  const { origin, status, request } = useGeo();
  const [vote, setVote] = useState<boolean | null>(null);
  const [yes, setYes] = useState(link.reportsVigente);
  const [no, setNo] = useState(link.reportsCaduco);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxKm = presenceMaxKm();
  const km = haversineKm(origin, branchGeo);
  const near = status === "ready" && km <= maxKm;

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
  const crowd = crowdStatus(liveLink);

  async function report(stillValid: boolean) {
    if (!user || busy) return;
    if (status !== "ready") {
      request();
      setError("Activa el GPS para confirmar que estás en la sucursal.");
      return;
    }
    if (!near) {
      setError(`Acércate a menos de ${Math.round(maxKm * 1000)} m (${formatKm(km)} ahora).`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reportes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promoId,
        branchId,
        stillValid,
        lat: origin.lat,
        lng: origin.lng,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "No se pudo guardar el reporte.");
      return;
    }
    setYes(data.reportsVigente);
    setNo(data.reportsCaduco);
    setVote(data.mine);
  }

  return (
    <div className="mt-3 border-t border-white/8 pt-3">
      <p className="text-xs uppercase tracking-wider text-[var(--gold)]">{STATUS_LABELS[crowd]}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {yes} dicen que sigue · {no} dicen que ya no · votos de {VOTE_WINDOW_DAYS} días
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {status === "ready"
          ? near
            ? `Estás a ${formatKm(km)} · puedes reportar`
            : `Estás a ${formatKm(km)} · hay que estar en el local`
          : "GPS apagado: no se puede votar de lejos"}
      </p>
      {!user ? (
        <Link href="/registro" className="mt-2 inline-block text-xs text-[var(--gold)]">
          Entra con cuenta 18+ para reportar
        </Link>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
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
      {error && <p className="mt-2 text-xs text-[var(--copper)]">{error}</p>}
    </div>
  );
}
