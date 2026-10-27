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

/**
 * Abre UN pin en lat/lng (dato OSM).
 * No usa /search/Marca/@… — eso lista todos los Liverpool de la ZMG.
 */
export function googleMapsExactUrl(place: {
  lat?: number | null;
  lng?: number | null;
  long?: number | null;
  name?: string;
  address?: string;
  city?: string;
}): string | null {
  const lat = Number(place.lat);
  const lng = Number(place.lng ?? place.long);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const name = (place.name || '').trim();
  const address = (place.address || '').trim();

  if (hasCoords) {
    // Solo lat,lng: un pin. Si metemos el nombre, Google vuelve a listar la marca.
    return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
  }

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
