"use client";

import { useEffect, useState } from "react";
import { COUPON_COST } from "@/lib/rewards";

type Coupon = { code: string; label: string; costPoints: number };

export function RewardsPanel() {
  const [points, setPoints] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/recompensas");
    const data = await res.json();
    setPoints(data.points ?? 0);
    setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function redeem() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/recompensas", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.error === "string" ? data.error : "No se pudo canjear.");
      return;
    }
    setNote(`Cupón ${data.code} listo.`);
    await load();
  }

  return (
    <section className="mt-10 border border-white/10 p-4">
      <h2 className="font-display text-2xl text-[var(--foam)]">Recompensas</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Reporta vigencia y opina en sucursal. Con {COUPON_COST} puntos canjeas un cupón TraGo.
      </p>
      <p className="mt-4 text-3xl font-display text-[var(--gold)]">{points} pts</p>
      <button
        type="button"
        disabled={busy || points < COUPON_COST}
        onClick={redeem}
        className="mt-4 bg-[var(--copper)] px-4 py-2 text-sm font-semibold text-[#1a1008] disabled:opacity-40"
      >
        Canjear cupón ({COUPON_COST} pts)
      </button>
      {note && <p className="mt-2 text-xs text-[var(--gold)]">{note}</p>}
      <ul className="mt-4 space-y-2">
        {coupons.map((c) => (
          <li key={c.code} className="border border-white/10 px-3 py-2 text-sm">
            <span className="font-mono text-[var(--foam)]">{c.code}</span>
            <span className="mt-1 block text-xs text-[var(--muted)]">{c.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
