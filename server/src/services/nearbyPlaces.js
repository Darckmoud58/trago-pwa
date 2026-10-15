import Empresa from '../models/Empresa.js';
import NearbyPlaceCache from '../models/NearbyPlaceCache.js';
import Ubicacion from '../models/Ubicacion.js';
import {
  OFFICIAL_BRANDS,
  resolveOfficialBrand,
} from './officialPromoCollector.js';

/** Mirrors: Overpass público suele saturar; rotamos si el primario falla. */
const OVERPASS_URLS = (
  process.env.OVERPASS_API_URLS ||
  [
    process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OSM_MAP_API =
  process.env.OSM_MAP_API_URL || 'https://api.openstreetmap.org/api/0.6/map';
const NOMINATIM_URL =
  process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';

const CACHE_MS = 15 * 60 * 1000;
const GRID = 0.002;
const MAX_RESULTS = 300;
const DEFAULT_TIMEOUT_S = Number(process.env.OVERPASS_TIMEOUT_S || 12);

const VENUE_AMENITIES = new Set([
  'restaurant',
  'bar',
  'cafe',
  'pub',
  'fast_food',
  'nightclub',
  'biergarten',
  'food_court',
  'ice_cream',
]);

const UA =
  process.env.TRA_GO_USER_AGENT ||
  'TraGo/0.1 (+https://github.com/Darckmoud58/trago-pwa; nearby)';

/** Single-flight: muchas peticiones iguales → 1 Overpass. */
const inflight = new Map();

function cell(value) {
  return Number((Math.round(value / GRID) * GRID).toFixed(4));
}
function cacheKey(lat, lng, radius) {
  return `${cell(lat)}:${cell(lng)}:${radius}`;
}
function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function overpassQuery(lat, lng, radius, timeoutSeconds) {
  const venueArea = `around:${radius + 250},${lat},${lng}`;
  const shopArea = `around:${Math.min(radius, 2000) + 250},${lat},${lng}`;
  return `[out:json][timeout:${timeoutSeconds}];(nwr(${venueArea})["name"]["amenity"~"^(restaurant|bar|cafe|pub|fast_food|nightclub|biergarten|food_court|ice_cream)$"];nwr(${shopArea})["name"]["shop"];);out center;`;
}

function parseElements(elements = []) {
  const seen = new Set();
  return elements.flatMap((element) => {
    const tags = element.tags || {};
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    const name = String(tags.name || tags.brand || '').trim();
    const key = `${element.type}/${element.id}`;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        osmType: element.type,
        osmId: String(element.id),
        name,
        brand: String(tags.brand || '').trim(),
        operator: String(tags.operator || '').trim(),
        lat,
        lng,
        amenity: String(tags.amenity || ''),
        shop: String(tags.shop || ''),
        street: String(tags['addr:street'] || tags['addr:place'] || '').trim(),
        number: String(tags['addr:housenumber'] || '').trim(),
        suburb: String(tags['addr:suburb'] || tags['addr:neighbourhood'] || '').trim(),
        city: String(tags['addr:city'] || tags['addr:municipality'] || '').trim(),
        hours: String(tags.opening_hours || '').trim(),
        website: String(tags.website || tags['contact:website'] || '').trim(),
        osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      },
    ];
  });
}

async function requestOverpassOnce(url, lat, lng, radius, timeoutSeconds) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': UA,
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      data: overpassQuery(lat, lng, radius, timeoutSeconds),
    }),
    signal: AbortSignal.timeout((timeoutSeconds + 3) * 1000),
  });
  if (!response.ok) throw new Error(`OpenStreetMap Overpass respondió ${response.status}`);
  const text = await response.text();
  if (text.length > 2_000_000) {
    throw new Error('Respuesta Overpass demasiado grande');
  }
  const json = JSON.parse(text);
  return parseElements(json.elements)
    .sort(
      (a, b) =>
        distanceMeters(lat, lng, a.lat, a.lng) - distanceMeters(lat, lng, b.lat, b.lng)
    )
    .slice(0, MAX_RESULTS);
}

async function requestOverpass(lat, lng, radius, timeoutSeconds = DEFAULT_TIMEOUT_S) {
  let lastErr;
  for (const url of OVERPASS_URLS) {
    try {
      return await requestOverpassOnce(url, lat, lng, radius, timeoutSeconds);
    } catch (err) {
      lastErr = err;
      console.warn('Overpass falló:', url, err.message);
    }
  }
  throw lastErr || new Error('Overpass sin mirrors configurados');
}

function tagsFromXmlInner(inner = '') {
  const tags = {};
  for (const m of inner.matchAll(/<tag\s+k="([^"]+)"\s+v="([^"]*)"\s*\/>/g)) {
    tags[m[1]] = m[2];
  }
  return tags;
}

function placeFromOsmTags(osmType, osmId, lat, lng, tags) {
  const name = String(tags.name || tags.brand || '').trim();
  const amenity = String(tags.amenity || '');
  const shop = String(tags.shop || '');
  if (!name) return null;
  if (!VENUE_AMENITIES.has(amenity) && !shop) return null;
  return {
    osmType,
    osmId: String(osmId),
    name,
    brand: String(tags.brand || '').trim(),
    operator: String(tags.operator || '').trim(),
    lat,
    lng,
    amenity,
    shop,
    street: String(tags['addr:street'] || tags['addr:place'] || '').trim(),
    number: String(tags['addr:housenumber'] || '').trim(),
    suburb: String(
      tags['addr:suburb'] || tags['addr:neighbourhood'] || ''
    ).trim(),
    city: String(tags['addr:city'] || tags['addr:municipality'] || '').trim(),
    hours: String(tags.opening_hours || '').trim(),
    website: String(tags.website || tags['contact:website'] || '').trim(),
    osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
  };
}

/** Plan B cuando Overpass cae: bbox de la API pública OSM (más pesada, pero viva). */
async function requestOsmMapApi(lat, lng, radius) {
  // Bbox chico: en ciudad densa >2 km el XML se pasa de peso.
  const clampR = Math.min(Math.max(radius, 800), 1500);
  const dLat = clampR / 111_000;
  const dLng = clampR / (111_000 * Math.cos((lat * Math.PI) / 180));
  const left = lng - dLng;
  const right = lng + dLng;
  const bottom = lat - dLat;
  const top = lat + dLat;
  const url = `${OSM_MAP_API}?bbox=${left},${bottom},${right},${top}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/xml' },
    signal: AbortSignal.timeout(28_000),
  });
  if (!response.ok) throw new Error(`OSM map API respondió ${response.status}`);
  const xml = await response.text();
  if (xml.length > 12_000_000) throw new Error('OSM map API demasiado grande');

  const seen = new Set();
  const places = [];
  const nodeRe =
    /<node\s+([^>]+?)>([\s\S]*?)<\/node>|<node\s+([^>]+?)\/>/g;
  for (const m of xml.matchAll(nodeRe)) {
    const open = m[1] || m[3] || '';
    const inner = m[2] || '';
    const id = open.match(/\bid="(\d+)"/)?.[1];
    const nLat = Number(open.match(/\blat="([^"]+)"/)?.[1]);
    const nLng = Number(open.match(/\blon="([^"]+)"/)?.[1]);
    if (!id || !Number.isFinite(nLat) || !Number.isFinite(nLng)) continue;
    if (distanceMeters(lat, lng, nLat, nLng) > radius + 50) continue;
    const tags = tagsFromXmlInner(inner);
    const place = placeFromOsmTags('node', id, nLat, nLng, tags);
    if (!place || seen.has(place.osmUrl)) continue;
    seen.add(place.osmUrl);
    places.push(place);
  }

  return places
    .sort(
      (a, b) =>
        distanceMeters(lat, lng, a.lat, a.lng) -
        distanceMeters(lat, lng, b.lat, b.lng)
    )
    .slice(0, MAX_RESULTS);
}

/** Plan C: Nominatim por marcas oficiales (McDonald's, BK, etc.). */
async function requestNominatimOfficialBrands(lat, lng, radius) {
  const dLat = radius / 111_000;
  const dLng = radius / (111_000 * Math.cos((lat * Math.PI) / 180));
  const viewbox = `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`;
  const brands = Object.values(OFFICIAL_BRANDS);
  const places = [];
  const seen = new Set();

  // Lotes de 3 para no martillar Nominatim
  for (let i = 0; i < brands.length; i += 3) {
    const batch = brands.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (brand) => {
        const q = new URLSearchParams({
          format: 'json',
          limit: '5',
          bounded: '1',
          viewbox,
          q: brand.nombre,
        });
        try {
          const res = await fetch(`${NOMINATIM_URL}?${q}`, {
            headers: { 'User-Agent': UA, Accept: 'application/json' },
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) return [];
          const json = await res.json();
          return Array.isArray(json) ? json : [];
        } catch (err) {
          console.warn('Nominatim falló:', brand.nombre, err.message);
          return [];
        }
      })
    );
    for (const hits of results) {
      for (const hit of hits) {
        const nLat = Number(hit.lat);
        const nLng = Number(hit.lon);
        const name = String(hit.name || hit.display_name || '').split(',')[0].trim();
        const osmType = String(hit.osm_type || 'node');
        const osmId = String(hit.osm_id || hit.place_id || '');
        if (!name || !osmId || !Number.isFinite(nLat) || !Number.isFinite(nLng)) {
          continue;
        }
        if (distanceMeters(lat, lng, nLat, nLng) > radius) continue;
        const key = `${osmType}/${osmId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        places.push({
          osmType,
          osmId,
          name,
          brand: name,
          operator: '',
          lat: nLat,
          lng: nLng,
          amenity: 'fast_food',
          shop: '',
          street: '',
          number: '',
          suburb: '',
          city: '',
          hours: '',
          website: '',
          osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
        });
      }
    }
    if (i + 3 < brands.length) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return places
    .sort(
      (a, b) =>
        distanceMeters(lat, lng, a.lat, a.lng) -
        distanceMeters(lat, lng, b.lat, b.lng)
    )
    .slice(0, MAX_RESULTS);
}

async function requestOsmFallback(lat, lng, radius) {
  try {
    const mapPlaces = await requestOsmMapApi(lat, lng, radius);
    if (mapPlaces.length) {
      console.warn(`Cerca: Overpass caído → OSM map API (${mapPlaces.length} lugares)`);
      return mapPlaces;
    }
  } catch (err) {
    console.warn('OSM map API falló:', err.message);
  }
  const nom = await requestNominatimOfficialBrands(lat, lng, radius);
  if (nom.length) {
    console.warn(`Cerca: fallback Nominatim marcas (${nom.length} lugares)`);
    return nom;
  }
  throw new Error('Sin datos OSM (Overpass, map API y Nominatim fallaron)');
}

/** Fallback local: sucursales TraGo en Mongo cuando OSM no responde. */
async function discoverFromCatalog(lat, lng, maxMeters) {
  const docs = await Ubicacion.find({
    estatus: 'activo',
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxMeters,
      },
    },
  })
    .limit(80)
    .populate('id_empresa', 'nombre slug')
    .lean();

  const branches = docs.map((u) => {
    const company = u.id_empresa;
    const distance = distanceMeters(lat, lng, u.lat, u.long);
    const address = [u.calle, u.num_ext, u.colonia].filter(Boolean).join(' ');
    return {
      _id: String(u._id),
      slug: u.slug || String(u._id),
      nombre: u.nombre || company?.nombre || 'Sucursal',
      name: u.nombre || company?.nombre || 'Sucursal',
      chainName: company?.nombre || u.nombre || 'Cadena',
      id_empresa: company?._id || u.id_empresa || null,
      companyId: company?._id || u.id_empresa || null,
      calle: u.calle,
      num_ext: u.num_ext,
      colonia: u.colonia,
      municipio: u.municipio,
      estado: u.estado,
      address,
      city: u.municipio,
      hours: u.horario || '',
      website: '',
      lat: u.lat,
      long: u.long,
      location: u.location,
      amenity: '',
      shop: '',
      distanceMeters: Math.round(distance),
      osmUrl: null,
      source: 'catalog',
      active: true,
      withinRadius: true,
    };
  });

  return {
    branches,
    stale: false,
    cached: false,
    partial: false,
    searchedRadiusMeters: maxMeters,
    source: 'catalog',
  };
}

function matchCompany(place, companies) {
  const official = resolveOfficialBrand(place);
  if (official) {
    const hit = companies.find((c) => c.slug === official.slug);
    if (hit) return hit;
  }
  const labels = [place.brand, place.operator, place.name].map(normalize).filter(Boolean);
  return (
    companies
      .map((company) => ({
        company,
        name: normalize(company.nombre),
        slug: normalize(company.slug),
      }))
      .filter(({ name, slug }) => {
        const keys = [name, slug].filter((k) => k && k.length >= 3);
        return keys.some((key) =>
          labels.some(
            (label) =>
              label === key ||
              (key.length >= 4 && (label.includes(key) || key.includes(label)))
          )
        );
      })
      .sort(
        (a, b) =>
          Math.max(b.name.length, b.slug.length) - Math.max(a.name.length, a.slug.length)
      )[0]?.company || null
  );
}

function mapPlace(place, company, lat, lng, maxMeters) {
  const distance = distanceMeters(lat, lng, place.lat, place.lng);
  const address = [place.street, place.number, place.suburb].filter(Boolean).join(' ');
  return {
    _id: `osm-${place.osmType}-${place.osmId}`,
    slug: `osm-${place.osmType}-${place.osmId}`,
    nombre: place.name,
    name: place.name,
    chainName: company?.nombre || place.brand || place.operator || place.name,
    id_empresa: company?._id || null,
    companyId: company?._id || null,
    calle: place.street,
    num_ext: place.number,
    colonia: place.suburb,
    municipio: place.city,
    estado: '',
    address,
    city: place.city,
    hours: place.hours,
    website: place.website,
    lat: place.lat,
    long: place.lng,
    location: { type: 'Point', coordinates: [place.lng, place.lat] },
    amenity: place.amenity,
    shop: place.shop,
    distanceMeters: Math.round(distance),
    osmUrl: place.osmUrl,
    source: 'openstreetmap',
    active: true,
    withinRadius: distance <= maxMeters,
  };
}

async function fetchAndCachePlaces(searchLat, searchLng, maxMeters, previous) {
  let places = previous?.places || [];
  let searchedRadiusMeters = previous?.searchedRadiusMeters || maxMeters;
  let stale = false;
  let partial = false;
  let cached = Boolean(previous);
  if (!previous || new Date(previous.expiresAt).getTime() <= Date.now()) {
    try {
      places = await requestOverpass(searchLat, searchLng, maxMeters);
      searchedRadiusMeters = maxMeters;
    } catch (primaryError) {
      const reducedRadius = Math.min(maxMeters, 2500);
      let recovered = false;
      if (maxMeters - reducedRadius >= 500) {
        try {
          places = await requestOverpass(
            searchLat,
            searchLng,
            reducedRadius,
            Math.min(DEFAULT_TIMEOUT_S, 10)
          );
          searchedRadiusMeters = reducedRadius;
          partial = true;
          recovered = true;
        } catch {
          /* sigue a map/nominatim */
        }
      }
      if (!recovered) {
        try {
          places = await requestOsmFallback(searchLat, searchLng, maxMeters);
          searchedRadiusMeters = maxMeters;
          partial = true;
          recovered = true;
        } catch (fallbackErr) {
          console.warn('OSM fallback total:', fallbackErr.message);
          if (previous) {
            places = previous.places || [];
            searchedRadiusMeters = previous.searchedRadiusMeters || maxMeters;
            stale = true;
            recovered = true;
          } else {
            throw primaryError;
          }
        }
      }
      if (!recovered) throw primaryError;
    }
    if (!stale) {
      const fetchedAt = new Date();
      const key = cacheKey(searchLat, searchLng, maxMeters);
      /** Solo campos usados por mapPlace (no JSON crudo Overpass). */
      const slimPlaces = places.map((p) => ({
        osmType: p.osmType,
        osmId: p.osmId,
        name: p.name,
        brand: p.brand,
        operator: p.operator,
        lat: p.lat,
        lng: p.lng,
        amenity: p.amenity,
        shop: p.shop,
        street: p.street,
        number: p.number,
        suburb: p.suburb,
        city: p.city,
        hours: p.hours,
        website: p.website,
        osmUrl: p.osmUrl,
      }));
      await NearbyPlaceCache.findOneAndUpdate(
        { key },
        {
          $set: {
            places: slimPlaces,
            searchedRadiusMeters,
            fetchedAt,
            expiresAt: new Date(Date.now() + CACHE_MS),
          },
        },
        { upsert: true }
      );
      places = slimPlaces;
      cached = false;
    }
  }
  return { places, searchedRadiusMeters, stale, partial, cached };
}

/** Descubre lugares OSM sin agregarlos al catálogo de sucursales de TraGo. */
export async function discoverNearbyBranches(lat, lng, maxMeters) {
  const searchLat = cell(lat);
  const searchLng = cell(lng);
  const key = cacheKey(lat, lng, maxMeters);

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    try {
      const previous = await NearbyPlaceCache.findOne({ key }).lean();
      const fetched = await fetchAndCachePlaces(
        searchLat,
        searchLng,
        maxMeters,
        previous
      );
      const companies = await Empresa.find({ estatus: 'activo' })
        .select('_id nombre slug')
        .lean();
      const branches = fetched.places
        .map((place) =>
          mapPlace(place, matchCompany(place, companies), lat, lng, maxMeters)
        )
        .filter((place) => place.withinRadius)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
      return {
        branches,
        stale: fetched.stale,
        cached: fetched.cached,
        partial: fetched.partial,
        searchedRadiusMeters: fetched.searchedRadiusMeters,
        source: fetched.stale
          ? 'openstreetmap-cache-stale'
          : fetched.cached
            ? 'openstreetmap-cache'
            : 'openstreetmap',
      };
    } catch (osmErr) {
      console.error('discoverNearbyBranches OSM:', osmErr.message);
      try {
        const catalog = await discoverFromCatalog(lat, lng, maxMeters);
        console.warn(
          `Cerca: OSM caído → fallback catálogo (${catalog.branches.length} sucursales)`
        );
        // Preferimos lista vacía / catálogo a 502: el GPS ya funcionó.
        return catalog;
      } catch (catalogErr) {
        console.error('discoverNearbyBranches catalog:', catalogErr.message);
        throw osmErr;
      }
    }
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/** Solo tests: limpia single-flight. */
export function clearNearbyInflight() {
  inflight.clear();
}
