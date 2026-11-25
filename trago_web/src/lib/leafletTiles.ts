import type { TileLayerOptions } from 'leaflet';

/**
 * Tiles raster para Leaflet sin pegarle a tile.openstreetmap.org
 * (403 / política de uso de los servidores voluntarios de OSM).
 *
 * CartoCDN redistribuye datos OSM con CDN propio; no requiere API key.
 * Atribución: © OpenStreetMap + © CARTO.
 */
export const OSM_CARTO_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const OSM_CARTO_TILE_OPTIONS: TileLayerOptions = {
  maxZoom: 20,
  subdomains: 'abcd',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};
