import type { TileLayerOptions } from 'leaflet';

/**
 * Tiles raster para Leaflet sin API key y sin tile.openstreetmap.org
 * (403 / política de uso de los servidores voluntarios de OSM).
 *
 * OSM France HOT (Humanitarian): subdominios a/b/c, sin key.
 * CartoCDN Voyager ya exige API key (tiles «API KEY REQUIRED»).
 * Atribución: © OpenStreetMap + © OSM France / HOT.
 */
export const OSM_HOT_TILE_URL =
  'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

export const OSM_HOT_TILE_OPTIONS: TileLayerOptions = {
  maxZoom: 19,
  subdomains: 'abc',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://www.openstreetmap.fr/">OSM France</a> HOT',
};

/** @deprecated Usar OSM_HOT_*; se mantienen por compatibilidad de imports. */
export const OSM_CARTO_TILE_URL = OSM_HOT_TILE_URL;
/** @deprecated Usar OSM_HOT_*; se mantienen por compatibilidad de imports. */
export const OSM_CARTO_TILE_OPTIONS = OSM_HOT_TILE_OPTIONS;
