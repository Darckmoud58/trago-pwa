/** Busca un lugar por dirección postal. Las coordenadas en el texto hacen que Google liste varios. */
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

/** Hay calle y número: alcanza para un solo resultado, sin geocodificar de nuevo. */
export function hasStreetAddress(address?: string) {
  return Boolean(address && /\d/.test(address));
}
