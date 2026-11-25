import { useEffect, useId, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '../lib/i18n';
import {
  OSM_STREET_TILE_OPTIONS,
  OSM_STREET_TILE_URL,
} from '../lib/leafletTiles';
import './VigenciaMap.css';

export type VigenciaMapRow = {
  promoId: string;
  promoNombre: string;
  ubicacionId: string;
  sucursalNombre: string;
  crowdStatus: string;
  reportsVigente: number;
  reportsCaduco: number;
  lat: number | null;
  lng: number | null;
  activaOficial: boolean;
  reafirmadoEn?: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  vigente: '#1f7a3a',
  en_duda: '#b8860b',
  caduco: '#b91c1c',
  fuera: '#6b7280',
};

const GDL: L.LatLngExpression = [20.6767, -103.3496];

function pinIcon(status: string, selected: boolean) {
  const color = STATUS_COLOR[status] || STATUS_COLOR.fuera;
  const s = selected ? 26 : 16;
  return L.divIcon({
    className: 'vigencia-pin',
    html: `<span class="vigencia-pin-wrap" style="--pin:${color};--size:${s}px"><span class="vigencia-pin-halo"></span><span class="vigencia-pin-dot${selected ? ' is-selected' : ''}"></span></span>`,
    iconSize: [s + 18, s + 18],
    iconAnchor: [(s + 18) / 2, (s + 18) / 2],
  });
}

function rowKey(row: VigenciaMapRow) {
  return `${row.promoId}-${row.ubicacionId}`;
}

type Props = {
  rows: VigenciaMapRow[];
  selectedKey?: string | null;
  /** Como «Ver ofertas» en Cerca: acerca fuerte al pin. */
  dive?: boolean;
  onSelect?: (row: VigenciaMapRow) => void;
};

/**
 * Mapa de vigencia tipo NearMap/Cerca: pins + selección.
 * La ficha flotante la pinta Cadena (como cerca-float), no un popup de Leaflet.
 */
export default function VigenciaMap({
  rows,
  selectedKey,
  dive = false,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const mapId = useId().replace(/:/g, '');
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const selectedRef = useRef(selectedKey);
  selectedRef.current = selectedKey;

  const pointsSig = rows
    .map(
      (r) =>
        `${r.promoId}:${r.ubicacionId}:${r.lat}:${r.lng}:${r.crowdStatus}`
    )
    .join('|');

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapId, {
      zoomControl: false,
      attributionControl: true,
    }).setView(GDL, 12);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer(OSM_STREET_TILE_URL, OSM_STREET_TILE_OPTIONS).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current = new Map();
    };
  }, [mapId]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const points = rowsRef.current.filter(
      (r): r is VigenciaMapRow & { lat: number; lng: number } =>
        r.lat != null &&
        r.lng != null &&
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng)
    );

    layer.clearLayers();
    markersRef.current = new Map();
    if (!points.length) {
      map.setView(GDL, 12);
      return;
    }

    const bounds = L.latLngBounds([]);
    const picked = selectedRef.current;
    for (const row of points) {
      const key = rowKey(row);
      const marker = L.marker([row.lat, row.lng], {
        icon: pinIcon(row.crowdStatus, picked === key),
        title: `${row.sucursalNombre} · ${row.promoNombre}`,
        zIndexOffset: picked === key ? 400 : 0,
      });
      marker.on('click', () => onSelectRef.current?.(row));
      marker.addTo(layer);
      markersRef.current.set(key, marker);
      bounds.extend([row.lat, row.lng]);
    }

    if (bounds.isValid() && !picked) {
      map.fitBounds(bounds.pad(0.18), { maxZoom: 15, animate: false });
    }
    window.setTimeout(() => map.invalidateSize(), 60);
  }, [pointsSig]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const row of rowsRef.current) {
      if (row.lat == null || row.lng == null) continue;
      const key = rowKey(row);
      const marker = markersRef.current.get(key);
      if (!marker) continue;
      const on = key === selectedKey;
      marker.setIcon(pinIcon(row.crowdStatus, on));
      marker.setZIndexOffset(on ? 400 : 0);
    }
    if (!selectedKey) return;
    const picked = rowsRef.current.find((r) => rowKey(r) === selectedKey);
    if (!picked || picked.lat == null || picked.lng == null) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (dive) {
      if (reduce) map.setView([picked.lat, picked.lng], 18, { animate: false });
      else map.flyTo([picked.lat, picked.lng], 18, { duration: 0.75 });
    } else if (reduce) {
      map.panTo([picked.lat, picked.lng], { animate: false });
    } else {
      map.panTo([picked.lat, picked.lng], { animate: true, duration: 0.45 });
    }
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [selectedKey, dive]);

  const pointsCount = rows.filter(
    (r) => r.lat != null && r.lng != null
  ).length;

  return (
    <div className="vigencia-map-shell">
      <div
        id={mapId}
        className="vigencia-map"
        role="img"
        aria-label={t('mapVigenciaAria')}
      />
      {!pointsCount && (
        <p className="vigencia-map-empty muted">{t('mapVigenciaNoCoords')}</p>
      )}
    </div>
  );
}

export { STATUS_COLOR, rowKey as vigenciaRowKey };
