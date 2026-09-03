"use client";

import { useEffect, useMemo, useState } from "react";
import { nearbyPromos } from "@/lib/catalog";
import type { Branch, BranchPromo, Promo } from "@/lib/types";
import type { CrowdStatus } from "@/lib/validity";
import { PromoCard } from "./PromoCard";
import { useGeo } from "./GeoProvider";
import { GeoChip } from "./GeoChip";
import { useCatalog } from "./CatalogProvider";

type NearbyRow = {
  promo: Promo;
  nearest: {
    km: number;
    branch: Branch;
    link: BranchPromo;
    status?: CrowdStatus;
  };
};

export function NearbyPromos({
  nocturno = false,
  birthday = false,
}: {
  nocturno?: boolean;
  birthday?: boolean;
}) {
  const catalog = useCatalog();
  const { origin, status } = useGeo();
  const fallback = useMemo(
    () => nearbyPromos(catalog, origin, { nocturno, birthday, maxKm: 40 }),
    [catalog, origin, nocturno, birthday],
  );
  const [rows, setRows] = useState<NearbyRow[]>(fallback);
  const [source, setSource] = useState<"local" | "geoNear" | "haversine">("local");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows(fallback);
    setSource("local");
  }, [fallback]);

  useEffect(() => {
    if (status !== "ready" && status !== "denied") return;
    const params = new URLSearchParams({
      lat: String(origin.lat),
      lng: String(origin.lng),
      maxKm: "40",
    });
    if (nocturno) params.set("nocturno", "1");
    if (birthday) params.set("birthday", "1");

    let cancelled = false;
    setLoading(true);
    fetch(`/api/cerca?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.rows)) return;
        setRows(data.rows);
        setSource(data.source === "geoNear" ? "geoNear" : "haversine");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [origin.lat, origin.lng, status, nocturno, birthday]);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-[var(--foam)]">
            {birthday
              ? "Hoy, por tu cumpleaños"
              : nocturno
                ? "Noche: botellas y tragos"
                : "Vigentes cerca"}
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {loading
              ? "Consultando cercanía…"
              : source === "geoNear"
                ? "Mongo · índice 2dsphere"
                : source === "haversine"
                  ? "Cálculo local (fallback)"
                  : "Catálogo en memoria"}
          </p>
        </div>
        <GeoChip />
      </div>
      {rows.length === 0 ? (
        <p className="text-[var(--muted)]">
          {birthday
            ? "No hay regalos de cumpleaños cerca en este radio."
            : nocturno
              ? "Nada abierto ahora en este radio (horario de sucursal + noche)."
              : "No hay promos activas en este radio."}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {rows.map(({ promo, nearest }) => (
            <PromoCard
              key={promo.id}
              promo={promo}
              km={nearest.km}
              branch={nearest.branch}
              link={nearest.link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
