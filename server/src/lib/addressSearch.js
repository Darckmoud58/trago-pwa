const NOMINATIM_URL =
  process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
const UA =
  process.env.TRA_GO_USER_AGENT ||
  'TraGo/0.1 (+https://github.com/Darckmoud58/trago-pwa; address)';

/** Sesgo de ancla GDL. No encierra la búsqueda: después se mezclan otros municipios. */
const GDL_VIEWBOX = '-103.7,20.95,-103.1,20.45';

const cache = new Map();
const HIT_TTL_MS = 2 * 60 * 1000;

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/**
 * @param {Record<string, unknown>} hit
 * @param {string} [queryCalle]
 */
export function mapNominatimHit(hit, queryCalle = '') {
  const address = hit?.address && typeof hit.address === 'object' ? hit.address : {};
  const country = String(address.country_code || '').toLowerCase();
  if (country && country !== 'mx') return null;
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const road = String(
    address.road || address.pedestrian || address.residential || ''
  ).trim();
  const head = String(hit?.display_name || '').split(',')[0].trim();
  const needle = fold(queryCalle);
  const roadHit = needle && fold(road).includes(needle);
  const headHit = needle && fold(head).includes(needle);
  if (needle && !roadHit && !headHit && !fold(hit?.display_name).includes(needle)) {
    return null;
  }
  const calle = roadHit ? road : headHit ? head : road;
  const municipio = String(
    address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
      ''
  ).trim();

  return {
    calle,
    numero: String(address.house_number || '').trim(),
    colonia: String(
      address.suburb ||
        address.neighbourhood ||
        address.quarter ||
        address.city_district ||
        ''
    ).trim(),
    municipio,
    estado: String(address.state || '').trim(),
    codigoPostal: String(address.postcode || '').replace(/\s/g, '').slice(0, 10),
    lat,
    lng,
    etiqueta: String(hit.display_name || '').trim(),
  };
}

async function fetchPlaces(query, extra, fetchImpl) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'mx');
  url.searchParams.set('limit', '6');
  url.searchParams.set('accept-language', 'es');
  url.searchParams.set('q', query);
  for (const [key, value] of Object.entries(extra)) {
    url.searchParams.set(key, value);
  }
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const err = new Error('No se pudo consultar la dirección');
    err.status = 502;
    throw err;
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Busca calle + número + CP dentro de México. No inventa coordenadas.
 * @param {{ calle?: string, numero?: string, cp?: string }} query
 * @param {typeof fetch} [fetchImpl]
 */
export async function searchMexicoAddress(query, fetchImpl = fetch) {
  const calle = String(query.calle || '').trim().slice(0, 120);
  const numero = String(query.numero || '').trim().slice(0, 20);
  const cp = String(query.cp || '').replace(/\D/g, '').slice(0, 5);
  if (calle.length < 3) return [];

  const text = [numero, calle, cp].filter(Boolean).join(' ');
  const key = text.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.lugares;

  const passes = [{ viewbox: GDL_VIEWBOX, bounded: '0' }];
  if (cp.length !== 5) passes.push({});

  const seen = new Set();
  const lugares = [];
  for (const extra of passes) {
    const rows = await fetchPlaces(text, extra, fetchImpl);
    for (const row of rows) {
      const lugar = mapNominatimHit(row, calle);
      if (!lugar?.municipio && !lugar?.etiqueta) continue;
      if (!lugar) continue;
      const id = `${lugar.lat.toFixed(5)},${lugar.lng.toFixed(5)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      lugares.push(lugar);
      if (lugares.length >= 6) break;
    }
    if (lugares.length >= 6) break;
  }

  cache.set(key, { lugares, expires: Date.now() + HIT_TTL_MS });
  return lugares;
}
