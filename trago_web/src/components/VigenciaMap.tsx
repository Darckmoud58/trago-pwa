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
  const size = selected ? 22 : 16;
  return L.divIcon({
    className: 'vigencia-pin',
    html: `<span class="vigencia-pin-wrap" style="--pin:${color};--size:${size}px"><span class="vigencia-pin-halo"></span><span class="vigencia-pin-dot${selected ? ' is-selected' : ''}"></span></span>`,
    iconSize: [size + 16, size + 16],
    iconAnchor: [(size + 16) / 2, (size + 16) / 2],
  });
}

function statusLabel(
  status: string,
  t: (key: 'statusVigente' | 'statusEnDuda' | 'statusCaduco' | 'statusFuera') => string
) {
  if (status === 'en_duda' || status === 'en-duda') return t('statusEnDuda');
  if (status === 'caduco') return t('statusCaduco');
  if (status === 'fuera') return t('statusFuera');
  return t('statusVigente');
}

type Props = {
  rows: VigenciaMapRow[];
  selectedKey?: string | null;
  onSelect?: (row: VigenciaMapRow) => void;
};

export default function VigenciaMap({ rows, selectedKey, onSelect }: Props) {
  const { t } = useI18n();
  const mapId = useId().replace(/:/g, '');
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const pointsSig = rows
    .map(
      (r) =>
        `${r.promoId}:${r.ubicacionId}:${r.lat}:${r.lng}:${r.crowdStatus}:${r.reportsVigente}:${r.reportsCaduco}`
    )
    .join('|');

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapId, {
      zoomControl: true,
      attributionControl: true,
    }).setView(GDL, 12);

    L.tileLayer(OSM_STREET_TILE_URL, OSM_STREET_TILE_OPTIONS).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
    };
  }, [mapId]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const points = rows.filter(
      (r): r is VigenciaMapRow & { lat: number; lng: number } =>
        r.lat != null &&
        r.lng != null &&
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng)
    );

    layer.clearLayers();
    markersRef.current.clear();
    if (!points.length) {
      map.setView(GDL, 12);
      return;
    }

    const bounds = L.latLngBounds([]);
    for (const row of points) {
      const key = `${row.promoId}-${row.ubicacionId}`;
      const marker = L.marker([row.lat, row.lng], {
        icon: pinIcon(row.crowdStatus, selectedKey === key),
        title: `${row.sucursalNombre} · ${row.promoNombre}`,
      });
      const status = statusLabel(row.crowdStatus, t);
      marker.bindPopup(
        `<div class="vigencia-popup">
          <p class="vigencia-popup-kicker">${escapeHtml(status)}</p>
          <strong>${escapeHtml(row.sucursalNombre)}</strong>
          <p>${escapeHtml(row.promoNombre)}</p>
          <p class="vigencia-popup-meta">${escapeHtml(
            t('voteCounts')
              .replace('{yes}', String(row.reportsVigente))
              .replace('{no}', String(row.reportsCaduco))
          )}${row.activaOficial ? '' : ` · ${escapeHtml(t('chainPaused'))}`}</p>
        </div>`,
        { maxWidth: 260, className: 'vigencia-leaflet-popup' }
      );
      marker.on('click', () => {
        onSelect?.(row);
        marker.openPopup();
        map.setView([row.lat, row.lng], Math.max(map.getZoom(), 16), {
          animate: true,
        });
      });
      marker.addTo(layer);
      markersRef.current.set(key, marker);
      bounds.extend([row.lat, row.lng]);
    }

    if (selectedKey) {
      const sel = points.find(
        (r) => `${r.promoId}-${r.ubicacionId}` === selectedKey
      );
      const marker = markersRef.current.get(selectedKey);
      if (sel) {
        map.setView([sel.lat, sel.lng], Math.max(map.getZoom(), 16), {
          animate: true,
        });
        marker?.openPopup();
        return;
      }
    }

    map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
  }, [pointsSig, rows, selectedKey, onSelect, t]);

  const pointsCount = rows.filter(
    (r) => r.lat != null && r.lng != null
  ).length;
  const selected = selectedKey
    ? rows.find((r) => `${r.promoId}-${r.ubicacionId}` === selectedKey)
    : null;

  return (
    <div className="vigencia-map-wrap">
      <div className="vigencia-map-legend" aria-hidden="true">
        {(['vigente', 'en_duda', 'caduco', 'fuera'] as const).map((s) => (
          <span key={s}>
            <i style={{ background: STATUS_COLOR[s] }} />
            {s === 'vigente'
              ? t('statusVigente')
              : s === 'en_duda'
                ? t('statusEnDuda')
                : s === 'caduco'
                  ? t('statusCaduco')
                  : t('statusFuera')}
          </span>
        ))}
      </div>
      <div className="vigencia-map-stage">
        <div
          id={mapId}
          className="vigencia-map"
          role="img"
          aria-label={t('mapVigenciaAria')}
        />
        {!pointsCount && (
          <p className="vigencia-map-empty muted">{t('mapVigenciaNoCoords')}</p>
        )}
        {selected && selected.lat != null && selected.lng != null ? (
          <aside className="vigencia-float" aria-live="polite">
            <p className="vigencia-float-kicker">
              {statusLabel(selected.crowdStatus, t)}
            </p>
            <h3>{selected.sucursalNombre}</h3>
            <p>{selected.promoNombre}</p>
            <p className="meta">
              {t('voteCounts')
                .replace('{yes}', String(selected.reportsVigente))
                .replace('{no}', String(selected.reportsCaduco))}
              {!selected.activaOficial ? ` · ${t('chainPaused')}` : ''}
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
