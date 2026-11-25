import type { TileLayerOptions } from 'leaflet';

/**
 * Tiles raster para Leaflet sin API key.
 * No usar tile.openstreetmap.org (403 / política OSM).
 * No usar basemaps.cartocdn.com (exige API key).
 * No usar OSM France HOT (estilo humanitario beige ≠ mapa de calles clásico).
 *
 * Mirror comunitario de Alemania: mismo estilo Mapnik que el OSM original.
 */
export const OSM_STREET_TILE_URL =
  'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';

export const OSM_STREET_TILE_OPTIONS: TileLayerOptions = {
  maxZoom: 18,
  subdomains: 'abc',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

/** Alias estable para NearMap / VigenciaMap. */
export const OSM_HOT_TILE_URL = OSM_STREET_TILE_URL;
export const OSM_HOT_TILE_OPTIONS = OSM_STREET_TILE_OPTIONS;

/** @deprecated Usar OSM_STREET_*; se mantienen por compatibilidad. */
export const OSM_CARTO_TILE_URL = OSM_STREET_TILE_URL;
/** @deprecated Usar OSM_STREET_*; se mantienen por compatibilidad. */
export const OSM_CARTO_TILE_OPTIONS = OSM_STREET_TILE_OPTIONS;
