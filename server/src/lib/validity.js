/**
 * Vigencia híbrida (portado de web_next_legacy):
 * - La cadena marca sucursales oficiales (activa_oficial).
 * - Los usuarios confirman o niegan en piso.
 * - Más reportes de caduco → en_duda / caduco; el folio oficial no se borra.
 */

export function crowdStatus(link) {
  if (!link || link.officialActive === false) return 'fuera';
  const yes = Number(link.reportsVigente || 0);
  const no = Number(link.reportsCaduco || 0);
  if (no >= yes + 3 && no >= 3) return 'caduco';
  if (no > yes && no >= 2) return 'en_duda';
  return 'vigente';
}

export const STATUS_LABELS = {
  vigente: 'Vigente aquí',
  en_duda: 'En duda',
  caduco: 'Ya no aplica',
  fuera: 'No participa',
};

/** Haversine en metros. */
export function distanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const PRESENCE_MAX_METERS = Number(
  process.env.TRAGO_PRESENCE_MAX_M || 400
);
export const VOTE_WINDOW_DAYS = 14;
export const VOTES_PER_HOUR = 12;

export function voteCutoff(now = new Date()) {
  return new Date(now.getTime() - VOTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
