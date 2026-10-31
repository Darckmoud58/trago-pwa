/** Busca un lugar por texto. Sin coords: Google puede listar toda la ciudad. */
export function googleMapsSearchUrl(place: {
  name?: string;
  address?: string;
  city?: string;
}): string | null {
  const query = [place.name, place.address, place.city]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type MapsPlace = {
  lat?: number | null;
  lng?: number | null;
  long?: number | null;
  name?: string;
  address?: string;
  city?: string;
  /** GPS del usuario (origen de la ruta). */
  originLat?: number | null;
  originLng?: number | null;
  /** Distancia en metros para elegir walking vs driving. */
  distanceMeters?: number | null;
};

function coordsOf(place: MapsPlace): { lat: number; lng: number } | null {
  const lat = Number(place.lat);
  const lng = Number(place.lng ?? place.long);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // 6 decimales ≈ 0.1 m — suficiente y estable en URL
  return {
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
  };
}

function travelMode(distanceMeters?: number | null): 'walking' | 'driving' {
  if (
    typeof distanceMeters === 'number' &&
    Number.isFinite(distanceMeters) &&
    distanceMeters <= 2500
  ) {
    return 'walking';
  }
  return 'driving';
}

/**
 * Ruta certera al pin OSM: destination=lat,lng (no búsqueda por marca).
 * Con origin del usuario abre Directions; sin origin, pin exacto con zoom.
 */
export function googleMapsDirectionsUrl(place: MapsPlace): string | null {
  const dest = coordsOf(place);
  if (!dest) return null;

  const mode = travelMode(place.distanceMeters);
  const params = new URLSearchParams({
    api: '1',
    destination: `${dest.lat},${dest.lng}`,
    travelmode: mode,
  });

  const oLat = Number(place.originLat);
  const oLng = Number(place.originLng);
  if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
    params.set(
      'origin',
      `${Math.round(oLat * 1e6) / 1e6},${Math.round(oLng * 1e6) / 1e6}`
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Abre UN pin en lat/lng (dato OSM) o ruta desde el GPS del usuario.
 * No usa /search/Marca/@… — eso lista todos los Liverpool de la ZMG.
 */
export function googleMapsExactUrl(place: MapsPlace): string | null {
  const dest = coordsOf(place);
  if (dest) {
    // Preferir Directions: más certero para “ir ahí” que un search genérico.
    const dir = googleMapsDirectionsUrl(place);
    if (dir) return dir;
  }

  const name = (place.name || '').trim();
  const address = (place.address || '').trim();

  // Sin GPS: solo si hay calle+número evitamos búsqueda genérica de marca.
  if (name && hasStreetAddress(address)) {
    return googleMapsSearchUrl({
      name,
      address,
      city: place.city,
    });
  }

  return googleMapsSearchUrl({
    name: place.name,
    address: place.address,
    city: place.city,
  });
}

/** Hay calle y número: alcanza para un solo resultado, sin geocodificar de nuevo. */
export function hasStreetAddress(address?: string) {
  return Boolean(address && /\d/.test(address));
}
