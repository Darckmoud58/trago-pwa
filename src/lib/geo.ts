import type { GeoPoint } from "./types";

/** Centro Histórico de Guadalajara — fallback si niegan GPS. */
export const DEFAULT_GEO: GeoPoint = { lat: 20.6767, lng: -103.3474 };

export const CITY_LABEL = "Guadalajara";

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number): string {
  if (km < 0.1) return "Aquí mismo";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
