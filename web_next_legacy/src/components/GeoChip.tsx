"use client";

import { CITY_LABEL } from "@/lib/geo";
import { useGeo } from "./GeoProvider";

export function GeoChip() {
  const { status, request } = useGeo();

  if (status === "ready") {
    return (
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
        {CITY_LABEL} · cerca de ti
      </p>
    );
  }

  if (status === "locating") {
    return (
      <p className="geo-pulse text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        Buscando tu zona…
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={request}
      className="text-xs uppercase tracking-[0.2em] text-[var(--copper)] underline-offset-4 hover:underline"
    >
      {status === "denied"
        ? `Usando centro ${CITY_LABEL} · activar GPS`
        : "Usar mi ubicación"}
    </button>
  );
}
