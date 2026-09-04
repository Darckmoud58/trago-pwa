"use client";

import { useEffect, useState } from "react";
import type { Branch } from "@/lib/types";
import { POINTS_REVIEW_NEAR, POINTS_REVIEW_REMOTE } from "@/lib/rewards";
import { useSession } from "./SessionProvider";
import { useGeo } from "./GeoProvider";
import Link from "next/link";

type Review = {
  userName: string;
  rating: number;
  text: string;
  nearStore: boolean;
  createdAt: string;
};

export function ExperienceReviews({
  promoId,
  branches,
}: {
  promoId: string;
  branches: Branch[];
}) {
  const user = useSession();
  const { origin, status } = useGeo();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/opiniones?promoId=${promoId}`)
      .then((r) => r.json())
      .then((d) => setReviews(Array.isArray(d.reviews) ? d.reviews : []))
      .catch(() => {});
  }, [promoId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !branchId) return;
    setBusy(true);
    setNote(null);
    const body: Record<string, unknown> = { promoId, branchId, rating, text };
    if (status === "ready") {
      body.lat = origin.lat;
      body.lng = origin.lng;
    }
    const res = await fetch("/api/opiniones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.error === "string" ? data.error : "No se guardó.");
      return;
    }
    setNote(`+${data.pointsAwarded} puntos · saldo ${data.points}`);
    setText("");
    const refreshed = await fetch(`/api/opiniones?promoId=${promoId}`).then((r) => r.json());
    setReviews(Array.isArray(refreshed.reviews) ? refreshed.reviews : []);
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl text-[var(--foam)]">Experiencia en sucursal</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Opina si la promo se cumplió. Ganas {POINTS_REVIEW_NEAR} pts cerca del local o{" "}
        {POINTS_REVIEW_REMOTE} a distancia. Las opiniones empujan a la cadena a cumplir.
      </p>

      {!user ? (
        <p className="mt-4 text-sm text-[var(--gold)]">
          <Link href="/registro">Entra con cuenta 18+</Link> para opinar y ganar puntos.
        </p>
      ) : branches.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Sin sucursales ligadas.</p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3 border border-white/10 p-4">
          <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
            Sucursal
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#08110e]">
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
            Calificación
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n} className="bg-[#08110e]">
                  {n} ★
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
            ¿Qué pasó en el local?
            <textarea
              required
              minLength={8}
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-[var(--foam)]"
              placeholder="La aplicaron en caja / me la negaron / había letra chica…"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-[var(--copper)] px-4 py-2 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Publicar opinión"}
          </button>
          {note && <p className="text-xs text-[var(--gold)]">{note}</p>}
        </form>
      )}

      <ul className="mt-6 divide-y divide-white/8 border border-white/10">
        {reviews.length === 0 ? (
          <li className="p-4 text-sm text-[var(--muted)]">Aún no hay opiniones.</li>
        ) : (
          reviews.map((r, i) => (
            <li key={`${r.userName}-${i}`} className="p-4">
              <p className="text-sm text-[var(--foam)]">
                {"★".repeat(r.rating)}
                <span className="ml-2 text-[var(--muted)]">{r.userName}</span>
                {r.nearStore && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--gold)]">
                    en sucursal
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{r.text}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
