"use client";

import { nearbyPromos } from "@/lib/catalog";
import { PromoCard } from "./PromoCard";
import { useGeo } from "./GeoProvider";
import { GeoChip } from "./GeoChip";
import { useCatalog } from "./CatalogProvider";

export function NearbyPromos({
  nocturno = false,
  birthday = false,
}: {
  nocturno?: boolean;
  birthday?: boolean;
}) {
  const catalog = useCatalog();
  const { origin } = useGeo();
  const rows = nearbyPromos(catalog, origin, { nocturno, birthday, maxKm: 40 });

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl text-[var(--foam)]">
          {birthday
            ? "Hoy, por tu cumpleaños"
            : nocturno
              ? "Noche: botellas y tragos"
              : "Vigentes cerca"}
        </h2>
        <GeoChip />
      </div>
      {rows.length === 0 ? (
        <p className="text-[var(--muted)]">
          {birthday
            ? "No hay regalos de cumpleaños cerca en este radio."
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
