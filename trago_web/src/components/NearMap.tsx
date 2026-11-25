import { useEffect, useId, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '../lib/i18n';
import { OSM_HOT_TILE_OPTIONS, OSM_HOT_TILE_URL } from '../lib/leafletTiles';
import './NearMap.css';

export type NearMapPlace = {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lng: number;
  hasOffer?: boolean;
};

type Props = {
  places: NearMapPlace[];
  you?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  /** Acerca el mapa hasta el pin. El clic solo lo centra. */
  dive?: boolean;
  onSelect?: (id: string) => void;
};

function placeIcon(selected: boolean, hasOffer: boolean) {
  const size = selected ? 28 : hasOffer ? 20 : 14;
  const cls = [
    'near-pin-dot',
    hasOffer ? 'has-offer' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return L.divIcon({
    className: 'near-pin',
    html: `<span class="near-pin-wrap" style="--size:${size}px"><span class="near-pin-halo"></span><span class="${cls}"></span></span>`,
    iconSize: [size + 18, size + 18],
    iconAnchor: [(size + 18) / 2, (size + 18) / 2],
  });
}

function youIcon() {
  return L.divIcon({
    className: 'near-pin',
    html: '<span class="near-pin-you"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function NearMap({ places, you, selectedId, dive = false, onSelect }: Props) {
  const { t } = useI18n();
  const mapId = useId().replace(/:/g, '');
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const placesSig = places
    .map((p) => `${p.id}:${p.lat}:${p.lng}:${p.hasOffer ? 1 : 0}`)
    .join('|');
  const youSig = you ? `${you.lat}:${you.lng}` : '';

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapId, {
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer(OSM_HOT_TILE_URL, OSM_HOT_TILE_OPTIONS).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current = new Map();
    };
  }, [mapId]);

  const placesRef = useRef(places);
  const youRef = useRef(you);
  const selectedRef = useRef(selectedId);
  placesRef.current = places;
  youRef.current = you;
  selectedRef.current = selectedId;

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current = new Map();
    const bounds = L.latLngBounds([]);
    const currentYou = youRef.current;
    const picked = selectedRef.current;

    if (
      currentYou &&
      Number.isFinite(currentYou.lat) &&
      Number.isFinite(currentYou.lng)
    ) {
      L.marker([currentYou.lat, currentYou.lng], {
        icon: youIcon(),
        title: t('cercaMapYou'),
        zIndexOffset: 500,
        interactive: false,
      }).addTo(layer);
      bounds.extend([currentYou.lat, currentYou.lng]);
    }

    for (const place of placesRef.current) {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue;
      const marker = L.marker([place.lat, place.lng], {
        icon: placeIcon(picked === place.id, Boolean(place.hasOffer)),
        title: place.name,
        zIndexOffset: place.hasOffer ? 200 : 0,
      });
      marker.on('click', () => onSelectRef.current?.(place.id));
      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
      bounds.extend([place.lat, place.lng]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18), { maxZoom: 15, animate: false });
    }
    window.setTimeout(() => map.invalidateSize(), 60);
  }, [placesSig, youSig, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const place of placesRef.current) {
      const marker = markersRef.current.get(place.id);
      if (!marker) continue;
      const on = place.id === selectedId;
      marker.setIcon(placeIcon(on, Boolean(place.hasOffer)));
      marker.setZIndexOffset(on ? 400 : place.hasOffer ? 200 : 0);
    }
    if (!selectedId) return;
    const picked = placesRef.current.find((place) => place.id === selectedId);
    if (!picked) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (dive) {
      if (reduce) map.setView([picked.lat, picked.lng], 19, { animate: false });
      else map.flyTo([picked.lat, picked.lng], 19, { duration: 0.82 });
    } else if (reduce) {
      map.panTo([picked.lat, picked.lng], { animate: false });
    } else {
      map.panTo([picked.lat, picked.lng], { animate: true, duration: 0.45 });
    }
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [selectedId, dive]);

  return (
    <div
      id={mapId}
      className="near-map"
      role="img"
      aria-label={t('cercaMapAria')}
    />
  );
}
