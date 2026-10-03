import Empresa from '../models/Empresa.js';
import NearbyPlaceCache from '../models/NearbyPlaceCache.js';

const OVERPASS_URL = process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
const CACHE_MS = 15 * 60 * 1000;
const GRID = 0.002;
const MAX_RESULTS = 300;

function cell(value) { return Number((Math.round(value / GRID) * GRID).toFixed(4)); }
function cacheKey(lat, lng, radius) { return `${cell(lat)}:${cell(lng)}:${radius}`; }
function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function normalize(value = '') { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }

function overpassQuery(lat, lng, radius) {
  const around = `around:${radius + 250},${lat},${lng}`;
  return `[out:json][timeout:8];(nwr(${around})["name"]["amenity"~"^(restaurant|bar|cafe|pub|fast_food|nightclub|biergarten|food_court|ice_cream)$"];nwr(${around})["name"]["shop"];nwr(${around})["name"]["craft"];);out center;`;
}
function parseElements(elements = []) {
  const seen = new Set();
  return elements.flatMap((element) => {
    const tags = element.tags || {};
    const lat = Number(element.lat ?? element.center?.lat), lng = Number(element.lon ?? element.center?.lon);
    const name = String(tags.name || tags.brand || '').trim();
    const key = `${element.type}/${element.id}`;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || seen.has(key)) return [];
    seen.add(key);
    return [{
      osmType: element.type, osmId: String(element.id), name, brand: String(tags.brand || '').trim(), operator: String(tags.operator || '').trim(), lat, lng,
      amenity: String(tags.amenity || ''), shop: String(tags.shop || ''),
      street: String(tags['addr:street'] || tags['addr:place'] || '').trim(), number: String(tags['addr:housenumber'] || '').trim(),
      suburb: String(tags['addr:suburb'] || tags['addr:neighbourhood'] || '').trim(), city: String(tags['addr:city'] || tags['addr:municipality'] || '').trim(),
      hours: String(tags.opening_hours || '').trim(), website: String(tags.website || tags['contact:website'] || '').trim(),
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    }];
  });
}
async function requestOverpass(lat, lng, radius) {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': process.env.TRA_GO_USER_AGENT || 'TraGo/0.1 (nearby places search)', Accept: 'application/json' },
    body: new URLSearchParams({ data: overpassQuery(lat, lng, radius) }), signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`OpenStreetMap Overpass respondió ${response.status}`);
  return parseElements((await response.json()).elements)
    .sort((a, b) => distanceMeters(lat, lng, a.lat, a.lng) - distanceMeters(lat, lng, b.lat, b.lng))
    .slice(0, MAX_RESULTS);
}
function matchCompany(place, companies) {
  const labels = [place.brand, place.operator, place.name].map(normalize).filter(Boolean);
  return companies
    .map((company) => ({ company, name: normalize(company.nombre), slug: normalize(company.slug) }))
    .filter(({ name, slug }) => Math.max(name.length, slug.length) >= 4 && labels.some((label) => label === name || label === slug))
    .sort((a, b) => Math.max(b.name.length, b.slug.length) - Math.max(a.name.length, a.slug.length))[0]?.company || null;
}
function mapPlace(place, company, lat, lng, maxMeters) {
  const distance = distanceMeters(lat, lng, place.lat, place.lng);
  const address = [place.street, place.number, place.suburb].filter(Boolean).join(' ');
  return {
    _id: `osm-${place.osmType}-${place.osmId}`, slug: `osm-${place.osmType}-${place.osmId}`,
    nombre: place.name, name: place.name, chainName: company?.nombre || place.brand || place.operator || place.name,
    id_empresa: company?._id || null, companyId: company?._id || null,
    calle: place.street, num_ext: place.number, colonia: place.suburb, municipio: place.city, estado: '',
    address, city: place.city, hours: place.hours, website: place.website, lat: place.lat, long: place.lng,
    location: { type: 'Point', coordinates: [place.lng, place.lat] }, amenity: place.amenity, shop: place.shop,
    distanceMeters: Math.round(distance), osmUrl: place.osmUrl, source: 'openstreetmap', active: true,
    withinRadius: distance <= maxMeters,
  };
}

/** Descubre lugares OSM sin agregarlos al catálogo de sucursales de TraGo. */
export async function discoverNearbyBranches(lat, lng, maxMeters) {
  const searchLat = cell(lat), searchLng = cell(lng), key = cacheKey(lat, lng, maxMeters);
  const previous = await NearbyPlaceCache.findOne({ key }).lean();
  let places = previous?.places || [], stale = false, cached = Boolean(previous);
  if (!previous || new Date(previous.expiresAt).getTime() <= Date.now()) {
    try {
      places = await requestOverpass(searchLat, searchLng, maxMeters);
      const fetchedAt = new Date();
      await NearbyPlaceCache.findOneAndUpdate({ key }, { $set: { places, fetchedAt, expiresAt: new Date(Date.now() + CACHE_MS) } }, { upsert: true });
      cached = false;
    } catch (error) {
      if (!previous) throw error;
      places = previous.places || []; stale = true;
    }
  }
  const companies = await Empresa.find({ estatus: 'activo' }).select('_id nombre slug').lean();
  const branches = places.map((place) => mapPlace(place, matchCompany(place, companies), lat, lng, maxMeters))
    .filter((place) => place.withinRadius).sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { branches, stale, cached };
}
