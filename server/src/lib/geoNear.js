/** Radios permitidos para /cerca (cuantizados). */
export const ALLOWED_NEAR_RADII = [1000, 2500, 5000, 8000];

/** Caja aproximada de México (rechaza resto del planeta). */
export const MEXICO_BOUNDS = {
  latMin: 14,
  latMax: 33,
  lngMin: -119,
  lngMax: -86,
};

export function quantizeMaxMeters(raw, fallback = 8000) {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  let best = ALLOWED_NEAR_RADII[0];
  let bestDiff = Math.abs(n - best);
  for (const r of ALLOWED_NEAR_RADII) {
    const d = Math.abs(n - r);
    if (d < bestDiff) {
      best = r;
      bestDiff = d;
    }
  }
  return best;
}

export function assertMexicoCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: 'Coordenadas lng y lat válidas son requeridas' };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, message: 'Coordenadas lng y lat válidas son requeridas' };
  }
  const { latMin, latMax, lngMin, lngMax } = MEXICO_BOUNDS;
  if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) {
    return {
      ok: false,
      status: 422,
      message:
        'TraGo cubre México por ahora. Usa coordenadas dentro del país (piloto GDL/CDMX).',
    };
  }
  return { ok: true };
}
