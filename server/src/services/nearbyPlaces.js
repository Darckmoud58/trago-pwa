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
  return `${cell(lat)}:${cell(lng)}:${radius}:v3`;
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

function wayPoints(inner, nodes) {
  const points = [];
  for (const ref of inner.matchAll(/<nd\s+ref="(\d+)"\s*\/>/g)) {
    const point = nodes.get(ref[1]);
    if (point) points.push(point);
  }
  return points;
}

function centroid(points) {
  if (!points.length) return null;
  let lat = 0;
  let lng = 0;
  for (const point of points) {
    lat += point.lat;
    lng += point.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

/** Dos calles más cercanas al local, para distinguir sucursales del mismo nombre. */
function cornerFromRoads(lat, lng, roads) {
  const ranked = [];
  for (const road of roads) {
    let best = Infinity;
    for (const point of road.points) {
      const distance = distanceMeters(lat, lng, point.lat, point.lng);
      if (distance < best) best = distance;
      if (best < 20) break;
    }
    if (best <= 140) ranked.push({ name: road.name, distance: best, side: road.side });
  }
  ranked.sort((a, b) => a.distance - b.distance);
  const driving = ranked.filter((road) => !road.side);
  const source = driving.length >= 2 ? driving : ranked;
  const names = [];
  for (const road of source) {
    if (!names.includes(road.name)) names.push(road.name);
    if (names.length >= 2) break;
  }
  if (names.length >= 2) return `${names[0]} y ${names[1]}`;
  return names[0] || '';
}

function rememberPlace(places, seen, place) {
  if (!place || seen.has(place.osmUrl)) return;
  const duplicate = places.some(
    (current) =>
      normalize(current.name) === normalize(place.name) &&
      distanceMeters(current.lat, current.lng, place.lat, place.lng) < 45
  );
  if (duplicate) return;
  seen.add(place.osmUrl);
  places.push(place);
}

/**
 * Nodos y edificios (ways) del bbox, más las calles con nombre.
 * Un Oxxo dibujado como edificio no existe si solo se leen nodos.
 */
async function readOsmMap(lat, lng, radius) {
  const clampR = Math.min(Math.max(radius, 800), 1500);
  const dLat = clampR / 111_000;
  const dLng = clampR / (111_000 * Math.cos((lat * Math.PI) / 180));
  const url = `${OSM_MAP_API}?bbox=${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/xml' },
    signal: AbortSignal.timeout(28_000),
  });
  if (!response.ok) throw new Error(`OSM map API respondió ${response.status}`);
  const xml = await response.text();
  if (xml.length > 12_000_000) throw new Error('OSM map API demasiado grande');

  const nodes = new Map();
  const nodeRe = /<node\s+([^>]*?)\/>|<node\s+([^>]+?)>([\s\S]*?)<\/node>/g;
  for (const match of xml.matchAll(nodeRe)) {
    const open = match[1] || match[2] || '';
    const id = open.match(/\bid="(\d+)"/)?.[1];
    const nLat = Number(open.match(/\blat="([^"]+)"/)?.[1]);
    const nLng = Number(open.match(/\blon="([^"]+)"/)?.[1]);
    if (!id || !Number.isFinite(nLat) || !Number.isFinite(nLng)) continue;
    nodes.set(id, { lat: nLat, lng: nLng });
  }
  nodeRe.lastIndex = 0;

  const seen = new Set();
  const places = [];
  const roads = [];
  for (const match of xml.matchAll(nodeRe)) {
    const open = match[1] || match[2] || '';
    const inner = match[3] || '';
    const id = open.match(/\bid="(\d+)"/)?.[1];
    const point = id ? nodes.get(id) : null;
    if (!point || distanceMeters(lat, lng, point.lat, point.lng) > radius + 50) continue;
    rememberPlace(
      places,
      seen,
      placeFromOsmTags('node', id, point.lat, point.lng, tagsFromXmlInner(inner))
    );
  }

  for (const match of xml.matchAll(/<way\s+([^>]+?)>([\s\S]*?)<\/way>/g)) {
    const id = match[1].match(/\bid="(\d+)"/)?.[1];
    const inner = match[2] || '';
    if (!id) continue;
    const tags = tagsFromXmlInner(inner);
    const points = wayPoints(inner, nodes);
    const center = centroid(points);
    if (!center) continue;
    const highway = String(tags.highway || '');
    const roadName = String(tags.name || '').trim();
    if (highway && roadName) {
      roads.push({
        name: roadName,
        side: SIDE_PATHS.has(highway),
        points,
      });
    }
    if (distanceMeters(lat, lng, center.lat, center.lng) > radius + 50) continue;
    rememberPlace(places, seen, placeFromOsmTags('way', id, center.lat, center.lng, tags));
  }

  for (const place of places) {
    const corner = cornerFromRoads(place.lat, place.lng, roads);
    if (corner.includes(' y ')) place.corner = corner;
    else if (!place.street && corner) place.street = corner;
  }

  return places
    .sort(
      (a, b) =>
        distanceMeters(lat, lng, a.lat, a.lng) - distanceMeters(lat, lng, b.lat, b.lng)
    )
    .slice(0, MAX_RESULTS);
}

/** Plan B cuando Overpass cae: bbox de la API pública OSM (más pesada, pero viva). */
async function requestOsmMapApi(lat, lng, radius) {
  const places = await readOsmMap(lat, lng, radius);
  places.enriched = true;
  return places;
}

/** Si Overpass no trae la esquina, el mismo mapa completa calles y edificios. */
async function enrichWithMap(places, lat, lng, radius) {
  if (places.enriched) return places;
  let mapped;
  try {
    mapped = await readOsmMap(lat, lng, radius);
  } catch (err) {
    console.warn('OSM map API (nombres):', err.message);
    return places;
  }
  const seen = new Set(places.map((place) => place.osmUrl));
  const merged = places.slice();
  for (const place of mapped) {
    rememberPlace(merged, seen, place);
  }
  const corners = new Map(mapped.map((place) => [place.osmUrl, place]));
  for (const place of merged) {
    const extra = corners.get(place.osmUrl);
    if (extra?.corner && !place.corner) place.corner = extra.corner;
    if (extra?.street && !place.street) place.street = extra.street;
  }
  return merged;
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

function mapPlace(place, company, lat, lng, maxMeters, nameCounts) {
  const distance = distanceMeters(lat, lng, place.lat, place.lng);
  const chainName = company?.nombre || place.brand || place.operator || place.name;
  const repeated = (nameCounts?.get(normalize(place.name)) || 0) > 1;
  const spot = place.corner || [place.street, place.number].filter(Boolean).join(' ');
  const corner = repeated && spot ? spot : '';
  const address = corner
    ? [place.suburb, place.city].filter(Boolean).join(', ')
    : [place.street, place.number, place.suburb].filter(Boolean).join(' ');
  return {
    _id: `osm-${place.osmType}-${place.osmId}`,
    slug: `osm-${place.osmType}-${place.osmId}`,
    nombre: place.name,
    name: place.name,
    label: corner,
    chainName,
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
      places = await enrichWithMap(places, searchLat, searchLng, searchedRadiusMeters);
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
        corner: p.corner,
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
      const nameCounts = new Map();
      for (const place of fetched.places) {
        const key = normalize(place.name);
        nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
      }
      const branches = fetched.places
        .map((place) =>
          mapPlace(place, matchCompany(place, companies), lat, lng, maxMeters, nameCounts)
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

const reverseCache = new Map();

function formatReverseAddress(address = {}) {
  const street = [address.road, address.house_number].filter(Boolean).join(' ');
  const hood = address.neighbourhood || address.suburb || address.quarter || '';
  const city = address.city || address.town || address.village || address.municipality || '';
  const locality = [address.postcode, city].filter(Boolean).join(' ');
  const state = address.state || '';
  return [street, hood, locality, state].filter(Boolean).join(', ');
}

const SIDE_PATHS = new Set([
  'cycleway',
  'footway',
  'path',
  'steps',
  'corridor',
  'pedestrian',
  'bridleway',
]);

/** Dos calles del cruce. La ciclovía no cuenta si hay avenidas con nombre. */
async function crossingStreets(lat, lng) {
  const pad = 0.0007;
  const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].map((n) => n.toFixed(6)).join(',');
  const response = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`, {
    headers: { 'User-Agent': UA, Accept: 'application/xml' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const xml = await response.text();
  const roads = [];
  const paths = [];
  for (const chunk of xml.split('<way ').slice(1)) {
    const body = chunk.slice(0, chunk.indexOf('</way>'));
    const kind = body.match(/k="highway" v="([^"]+)"/);
    if (!kind) continue;
    const match = body.match(/k="name" v="([^"]+)"/);
    if (!match) continue;
    const bucket = SIDE_PATHS.has(kind[1]) ? paths : roads;
    if (!bucket.includes(match[1])) bucket.push(match[1]);
  }
  const names = roads.length >= 2 ? roads : roads.concat(paths);
  return names.slice(0, 2);
}

/**
 * Texto para abrir un solo local en Google Maps.
 * Marca + las dos calles de ese punto: Google abre la ficha
 * (Oxxo Geminis frente a OXXO Leñadores). Solo el cruce abre la esquina.
 */
export async function reverseStreetAddress(lat, lng, placeName = '') {
  const name = String(placeName || '').trim();
  const key = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}|${name.toLowerCase()}`;
  const hit = reverseCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.address;
  const streets = await crossingStreets(lat, lng).catch(() => []);
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'es');
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);
  const data = await response.json();
  const postal = formatReverseAddress(data.address || {});
  const city = data.address?.city || data.address?.town || data.address?.municipality || '';
  const state = data.address?.state || '';
  const crossing = streets.length >= 2 ? `${streets[0]} y ${streets[1]}` : '';
  const locality = [city, state].filter(Boolean).join(', ');
  const base = [crossing, locality].filter(Boolean).join(', ') || postal;
  const mentioned = name && base.toLowerCase().includes(name.toLowerCase());
  const address = name && base && !mentioned ? `${name}, ${base}` : base || name;
  if (address) {
    reverseCache.set(key, { address, expires: Date.now() + 30 * 60 * 1000 });
  }
  return address;
}

/** Solo tests: limpia single-flight. */
export function clearNearbyInflight() {
  inflight.clear();
}
