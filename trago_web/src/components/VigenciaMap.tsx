import { useEffect, useId, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '../lib/i18n';
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
  const size = selected ? 18 : 14;
  return L.divIcon({
    className: 'vigencia-pin',
    html: `<span style="--pin:${color};--size:${size}px" class="vigencia-pin-dot${selected ? ' is-selected' : ''}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
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
    if (!points.length) {
      map.setView(GDL, 12);
      return;
    }

    const bounds = L.latLngBounds([]);
    for (const row of points) {
      const key = `${row.promoId}-${row.ubicacionId}`;
      const marker = L.marker([row.lat, row.lng], {
        icon: pinIcon(row.crowdStatus, selectedKey === key),
        title: `${row.sucursalNombre} · ${row.crowdStatus}`,
      });
      marker.bindPopup(
        `<strong>${escapeHtml(row.sucursalNombre)}</strong><br/>${escapeHtml(row.promoNombre)}<br/><em>${escapeHtml(row.crowdStatus)}</em><br/>✓ ${row.reportsVigente} · ✗ ${row.reportsCaduco}`
      );
      marker.on('click', () => onSelect?.(row));
      marker.addTo(layer);
      bounds.extend([row.lat, row.lng]);
    }

    if (selectedKey) {
      const sel = points.find(
        (r) => `${r.promoId}-${r.ubicacionId}` === selectedKey
      );
      if (sel) {
        map.setView([sel.lat, sel.lng], Math.max(map.getZoom(), 14), {
          animate: true,
        });
        return;
      }
    }

    map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
    // pointsSig captura cambios de filas/coords/estado sin recrear el array en deps
  }, [pointsSig, rows, selectedKey, onSelect]);

  const pointsCount = rows.filter(
    (r) => r.lat != null && r.lng != null
  ).length;

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
      <div id={mapId} className="vigencia-map" role="img" aria-label={t('mapVigenciaAria')} />
      {!pointsCount && (
        <p className="vigencia-map-empty muted">{t('mapVigenciaNoCoords')}</p>
      )}
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
