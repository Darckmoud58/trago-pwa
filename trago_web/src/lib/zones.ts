/**
 * Zonas explícitas para Cerca cuando el GPS falla.
 * Nunca sustituyen la ubicación en silencio: el caller debe etiquetar la demo.
 */

export type ZoneId = 'gdl';

export type ZoneDef = {
  id: ZoneId;
  lat: number;
  lng: number;
  /** Clave i18n del nombre visible (p. ej. centerGdl). */
  labelKey: 'centerGdl';
};

export const ZONES: Record<ZoneId, ZoneDef> = {
  gdl: {
    id: 'gdl',
    lat: 20.6767,
    lng: -103.3496,
    labelKey: 'centerGdl',
  },
};

export function resolveZone(zona?: string | null): ZoneDef {
  const key = String(zona || 'gdl')
    .trim()
    .toLowerCase()
    .slice(0, 32);
  if (key in ZONES) return ZONES[key as ZoneId];
  return ZONES.gdl;
}
