import mongoose from 'mongoose';
import Promocion from '../models/Promocion.js';
import Ubicacion from '../models/Ubicacion.js';
import Empresa from '../models/Empresa.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import {
  ensureOfficialCompanies,
  hasOfficialPromoSource,
  officialSourceSlugs,
  resolveOfficialBrand,
} from '../services/officialPromoCollector.js';
import { getOfficialRefreshStatus } from '../services/officialPromoJob.js';
import { discoverNearbyBranches, reverseStreetAddress } from '../services/nearbyPlaces.js';
import { crowdStatus } from '../lib/validity.js';
import {
  enrichBranchesWithDistance,
  upsertCompanyBranchesFromOsm,
  vinculoMeta,
} from '../services/promoBranchLinks.js';
import {
  filterPromosForViewer,
  isRestrictedPromo,
  mongoExcludeRestricted,
} from '../lib/ageGate.js';
import { assertMexicoCoords, quantizeMaxMeters } from '../lib/geoNear.js';

/** Evita CastError cuando id_empresa viene null/undefined (String(undefined) === "undefined"). */
function validObjectIds(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    if (value == null || value === '') continue;
    const id = String(value);
    if (id === 'undefined' || id === 'null' || seen.has(id)) continue;
    if (!mongoose.isValidObjectId(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function dateActiveFilter(now = new Date()) {
  return {
    estatus: 'activo',
    $and: [
      { $or: [{ inicia_en: null }, { inicia_en: { $lte: now } }] },
      { $or: [{ termina_en: null }, { termina_en: { $gte: now } }] },
    ],
  };
}

/** Solo scrapes oficiales (p. ej. cerca / job). */
function officialPromoFilter(now = new Date()) {
  return { origen: 'oficial', ...dateActiveFilter(now) };
}

/**
 * Catálogo público: oficiales + promos de cadena verificada con ≥1 sucursal.
 */
async function publicCatalogFilter(now = new Date()) {
  const verifiedIds = await Empresa.find({
    verificada: true,
    estatus: 'activo',
  }).distinct('_id');
  const linkedPromoIds = await PromoUbicacion.distinct('id_promo', {
    activa_oficial: { $ne: false },
  });
  return {
    ...dateActiveFilter(now),
    $or: [
      { origen: 'oficial' },
      {
        origen: 'empresa',
        id_empresa: { $in: verifiedIds },
        _id: { $in: linkedPromoIds },
      },
    ],
  };
}

function isPublicPromo(promo, empresa) {
  if (!promo || promo.estatus === 'inactivo') return false;
  if (promo.origen === 'oficial') return true;
  if (promo.origen === 'empresa' && empresa?.verificada) return true;
  return false;
}

function mapPromo(p, empresaById = {}) {
  const emp = empresaById[String(p.id_empresa)] || {};
  return {
    ...p,
    // aliases front (Todo_pwa / UI previa)
    title: p.nombre,
    origin: p.origen,
    url_fuente: p.url_fuente,
    subtitle: p.descripcion,
    chainName: emp.nombre || '',
    chainId: p.id_empresa,
    imageUrl: p.imagen,
    terms: p.politicas,
    active: p.estatus === 'activo',
    featured: p.destacada,
    startsAt: p.inicia_en,
    endsAt: p.termina_en,
    isBirthday: p.cumpleanos,
    isNocturno: p.nocturno,
    audience: p.audiencia === 'adulto' ? 'adult' : 'all',
  };
}

function mapUbicacion(u, empresaById = {}) {
  const emp = empresaById[String(u.id_empresa)] || {};
  return {
    ...u,
    name: u.nombre || u.calle,
    address: [u.calle, u.num_ext, u.colonia].filter(Boolean).join(' '),
    city: u.municipio,
    chainName: emp.nombre || '',
    chainId: u.id_empresa,
    hours: u.horario,
    imageUrl: u.imagen,
    active: u.estatus === 'activo',
  };
}

function mapEmpresa(e) {
  return {
    ...e,
    name: e.nombre,
    description: e.descripcion,
    mark: e.imagen,
  };
}

/** Detalle de una promoción por id o slug. */
export async function getPromo(req, res) {
  try {
    const { promoId } = req.params;
    const byId = mongoose.isValidObjectId(promoId)
      ? await Promocion.findById(promoId).lean()
      : null;
    const promo =
      byId ||
      (await Promocion.findOne({ slug: promoId, estatus: 'activo' }).lean());

    if (!promo || promo.estatus === 'inactivo') {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const empresa = promo.id_empresa
      ? await Empresa.findById(promo.id_empresa).lean()
      : null;
    if (!isPublicPromo(promo, empresa)) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }
    // Cadena verificada: sin sucursales no se publica (solo oficiales pueden listarse sin vínculo).
    if (promo.origen === 'empresa') {
      const n = await PromoUbicacion.countDocuments({
        id_promo: promo._id,
        activa_oficial: { $ne: false },
      });
      if (n === 0) {
        return res.status(404).json({ message: 'Promoción no encontrada' });
      }
    }

    // M1: restringida → 404 neutro (no revela umbral ni existencia).
    if (isRestrictedPromo(promo) && req.viewer && !req.viewer.canSeeAlcohol) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const empresaById = empresa
      ? { [String(empresa._id)]: empresa }
      : {};

    const links = await PromoUbicacion.find({
      id_promo: promo._id,
      activa_oficial: { $ne: false },
    }).lean();
    const linkByUbi = Object.fromEntries(
      links.map((l) => [String(l.id_ubicacion), l])
    );
    const ubicacionIds = links.map((l) => l.id_ubicacion).filter(Boolean);
    const ubicaciones = ubicacionIds.length
      ? await Ubicacion.find({ _id: { $in: ubicacionIds } }).lean()
      : [];

    const userLat = Number(req.query.lat);
    const userLng = Number(req.query.lng ?? req.query.long);
    const userGeo =
      Number.isFinite(userLat) && Number.isFinite(userLng)
        ? { lat: userLat, lng: userLng }
        : null;

    const mappedUbis = enrichBranchesWithDistance(
      ubicaciones.map((u) => {
        const link = linkByUbi[String(u._id)] || {};
        const reportsVigente = link.reportes_vigente || 0;
        const reportsCaduco = link.reportes_caduco || 0;
        const officialActive = link.activa_oficial !== false;
        const status = crowdStatus({
          officialActive,
          reportsVigente,
          reportsCaduco,
        });
        return {
          ...mapUbicacion(u, empresaById),
          lat: u.lat,
          long: u.long,
          lng: u.long,
          reportsVigente,
          reportsCaduco,
          officialActive,
          crowdStatus: status,
          origenVinculo: link.origen_vinculo || 'empresa',
          especificadoPorFuente: Boolean(link.especificado_por_fuente),
          participacionConfirmada: true,
        };
      }),
      userGeo
    );

    const fuenteEspecificada = links.some((l) => l.especificado_por_fuente);
    const vinculo = vinculoMeta(mappedUbis.length, fuenteEspecificada);

    res.json({
      promo: mapPromo(promo, empresaById),
      ubicaciones: mappedUbis,
      sucursalesParticipantes: mappedUbis,
      vinculoSucursales: vinculo,
    });
  } catch (e) {
    console.error('getPromo:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

/** Listado público: solo Mongo (scrapers corren en job de fondo). */
export async function listPromos(req, res) {
  try {
    const now = new Date();
    const refresh = await getOfficialRefreshStatus();
    const filter = await publicCatalogFilter(now);
    const ageFilter =
      req.viewer && !req.viewer.canSeeAlcohol ? mongoExcludeRestricted() : {};
    const promos = await Promocion.find({ ...filter, ...ageFilter })
      .sort({ destacada: -1, termina_en: 1 })
      .limit(100)
      .lean();
    const empresaIds = validObjectIds(promos.map((p) => p.id_empresa));
    const empresas = empresaIds.length
      ? await Empresa.find({ _id: { $in: empresaIds } }).lean()
      : [];
    const empresaById = Object.fromEntries(
      empresas.map((e) => [String(e._id), e])
    );
    const mapped = filterPromosForViewer(
      promos.map((p) => mapPromo(p, empresaById)),
      req.viewer
    );
    res.json({
      count: mapped.length,
      promos: mapped,
      sources: refresh.sources,
      sourcesRefreshedAt: refresh.at,
      ageGate: {
        band: req.viewer?.band || null,
        restrictedHidden: Boolean(req.viewer && !req.viewer.canSeeAlcohol),
      },
      emptyReason:
        mapped.length === 0
          ? 'Aún no hay ofertas disponibles. Prueba más tarde o mira Cerca.'
          : null,
    });
  } catch (e) {
    console.error('listPromos:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}


/** Promos oficiales cerca: solo lee Mongo (+ OSM). Scrapers = job / Scheduled Function. */
export async function nearbyPromos(req, res) {
  try {
    const lng = Number(req.query.lng ?? req.query.long);
    const lat = Number(req.query.lat);
    const geo = assertMexicoCoords(lat, lng);
    if (!geo.ok) {
      return res.status(geo.status || 400).json({ message: geo.message });
    }
    const maxMeters = quantizeMaxMeters(req.query.maxMeters, 2000);
    if (maxMeters == null) {
      return res.status(400).json({
        message: 'maxMeters debe ser numérico (se cuantiza a 1000/2000/2500/5000/8000)',
      });
    }
    const birthdayOnly =
      req.query.birthday === '1' ||
      req.query.cumpleanos === '1' ||
      req.query.cumple === '1';

    const discovery = await discoverNearbyBranches(lat, lng, maxMeters);
    let branches = discovery.branches;

    // Crea/actualiza empresas oficiales detectadas cerca (Circle K, HEB, OXXO…)
    const ensured = await ensureOfficialCompanies(branches, { allConfigured: false });
    const bySlug = Object.fromEntries(ensured.map((c) => [c.slug, c]));

    branches = branches.map((branch) => {
      const brand = resolveOfficialBrand(branch);
      const company = brand ? bySlug[brand.slug] : null;
      if (!company) return branch;
      return {
        ...branch,
        id_empresa: company._id,
        companyId: company._id,
        chainName: company.nombre || branch.chainName,
      };
    });

    const sourceCompanies = ensured.filter(
      (company) =>
        company?._id &&
        hasOfficialPromoSource(company.slug) &&
        branches.some((b) => String(b.id_empresa) === String(company._id))
    );

    // Persiste pins OSM de marcas conocidas como ubicaciones de catálogo.
    // No crea PromoUbicacion: estar cerca ≠ participar en la promo.
    const matchedBranches = branches.filter((b) => b.id_empresa || b.companyId);
    try {
      await upsertCompanyBranchesFromOsm(matchedBranches);
    } catch (persistErr) {
      console.error('nearbyPromos upsert branches:', persistErr.message);
    }

    const refresh = await getOfficialRefreshStatus();
    const sources =
      refresh.sources?.length > 0
        ? refresh.sources.filter((s) =>
            sourceCompanies.some((c) => c.nombre === s.empresa)
          )
        : sourceCompanies.map((company) => ({
            empresa: company.nombre,
            ok: false,
            count: 0,
            reason:
              'Fuente pendiente del job de refresco (cada 6 h). Se muestran promos oficiales ya guardadas.',
            lastFetchedAt: refresh.at,
          }));

    const now = new Date();
    const promoQuery = {
      ...officialPromoFilter(now),
      id_empresa: { $in: sourceCompanies.map((c) => c._id) },
      ...(birthdayOnly ? { cumpleanos: true } : {}),
    };
    const promos = sourceCompanies.length
      ? await Promocion.find(promoQuery)
          .sort({ destacada: -1, termina_en: 1 })
          .limit(200)
          .lean()
      : [];

    const promoIds = promos.map((p) => p._id);
    const allLinks = promoIds.length
      ? await PromoUbicacion.find({
          id_promo: { $in: promoIds },
          activa_oficial: { $ne: false },
        }).lean()
      : [];
    const linksByPromo = {};
    for (const link of allLinks) {
      const k = String(link.id_promo);
      if (!linksByPromo[k]) linksByPromo[k] = [];
      linksByPromo[k].push(link);
    }

    const companyById = Object.fromEntries(ensured.map((c) => [String(c._id), c]));
    const mappedRaw = promos.map((promo) => {
      const links = linksByPromo[String(promo._id)] || [];
      const fuenteEsp = links.some((l) => l.especificado_por_fuente);
      return {
        ...mapPromo(promo, companyById),
        sucursalesParticipantesCount: links.length,
        vinculoSucursales: vinculoMeta(links.length, fuenteEsp),
        // OSM cerca de la misma marca: candidatas, NO participación confirmada.
        ubicacionesCercanas: branches
          .filter((b) => String(b.id_empresa) === String(promo.id_empresa))
          .map((b) => ({
            _id: b._id,
            nombre: b.nombre || b.calle,
            distanceMeters: b.distanceMeters,
            osmUrl: b.osmUrl,
            participacionConfirmada: false,
          })),
      };
    });
    const mapped = filterPromosForViewer(mappedRaw, req.viewer);
    return res.json({
      count: mapped.length,
      radiusMeters: maxMeters,
      birthdayOnly,
      promos: mapped,
      ageGate: {
        band: req.viewer?.band || null,
        restrictedHidden: Boolean(req.viewer && !req.viewer.canSeeAlcohol),
      },
      sources,
      sourcesRefreshedAt: refresh.at,
      businessesFound: branches.length,
      searchedRadiusMeters: discovery.searchedRadiusMeters,
      partial: discovery.partial,
      businessesWithoutPromoSource: branches.filter((b) => !b.id_empresa).length,
      disclaimerSucursales:
        'Los lugares OSM cercanos de la misma marca no confirman que la promo aplique ahí. Solo las sucursales vinculadas participan.',
      locationSource: discovery.stale
        ? 'openstreetmap-cache-stale'
        : discovery.cached
          ? 'openstreetmap-cache'
          : 'openstreetmap',
    });
  } catch (e) {
    console.error('nearbyPromos:', e.message);
    return res.status(502).json({ message: 'No se pudieron consultar negocios y promociones cercanas' });
  }
}

/** Dirección postal de un punto, para abrir ese lugar en Google Maps y no una lista. */
export async function placeAddress(req, res) {
  try {
    const lng = Number(req.query.lng ?? req.query.long);
    const lat = Number(req.query.lat);
    const geo = assertMexicoCoords(lat, lng);
    if (!geo.ok) {
      return res.status(geo.status || 400).json({ message: geo.message });
    }
    const nombre = String(req.query.nombre || req.query.name || '').slice(0, 120);
    const address = await reverseStreetAddress(lat, lng, nombre);
    if (!address) return res.status(404).json({ message: 'Sin dirección para ese punto' });
    return res.json({ address });
  } catch (e) {
    console.error('placeAddress:', e.message);
    return res.status(502).json({ message: 'No se pudo leer la dirección del lugar' });
  }
}

/** Negocios, sucursales y restaurantes descubiertos alrededor del GPS con OpenStreetMap. */
export async function nearBranches(req, res) {
  try {
    const lng = Number(req.query.lng ?? req.query.long);
    const lat = Number(req.query.lat);
    const geo = assertMexicoCoords(lat, lng);
    if (!geo.ok) {
      return res.status(geo.status || 400).json({ message: geo.message });
    }
    const maxMeters = quantizeMaxMeters(req.query.maxMeters, 2000);
    if (maxMeters == null) {
      return res.status(400).json({
        message: 'maxMeters debe ser numérico (se cuantiza a 1000/2000/2500/5000/8000)',
      });
    }
    const discovery = await discoverNearbyBranches(lat, lng, maxMeters);
    const mapped = discovery.branches.map((branch) => {
      const brand = resolveOfficialBrand(branch);
      return {
        ...branch,
        osmUrl: branch.osmUrl,
        hasOfficialPromos: Boolean(brand && hasOfficialPromoSource(brand.slug)),
        officialBrand: brand?.nombre || null,
      };
    });
    return res.json({
      count: mapped.length,
      radiusMeters: maxMeters,
      searchedRadiusMeters: discovery.searchedRadiusMeters,
      partial: discovery.partial,
      branches: mapped,
      ubicaciones: mapped,
      source:
        discovery.source ||
        (discovery.stale
          ? 'openstreetmap-cache-stale'
          : discovery.cached
            ? 'openstreetmap-cache'
            : 'openstreetmap'),
      attribution:
        discovery.source === 'catalog'
          ? 'Catálogo TraGo (OpenStreetMap temporalmente no disponible)'
          : '© OpenStreetMap contributors',
      attributionUrl: 'https://www.openstreetmap.org/copyright',
      officialBrandsSupported: officialSourceSlugs(),
    });
  } catch (e) {
    console.error('nearBranches:', e.message);
    res.status(502).json({ message: 'No se pudieron buscar lugares cercanos en OpenStreetMap' });
  }
}

export async function listNegocios(_req, res) {
  try {
    const empresas = await Empresa.find({ estatus: 'activo' }).limit(100).lean();
    const mapped = empresas.map(mapEmpresa);
    res.json({ count: mapped.length, empresas: mapped, negocios: mapped });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function listPromoSucursales(req, res) {
  try {
    const { promoId } = req.params;
    if (!mongoose.isValidObjectId(promoId)) {
      return res.status(400).json({ message: 'promoId inválido' });
    }
    const links = await PromoUbicacion.find({ id_promo: promoId }).lean();
    const ubiIds = links.map((l) => l.id_ubicacion).filter(Boolean);
    const ubicaciones = ubiIds.length
      ? await Ubicacion.find({ _id: { $in: ubiIds } }).lean()
      : [];
    const ubiById = Object.fromEntries(ubicaciones.map((u) => [String(u._id), u]));
    const enriched = links.map((link) => {
      const u = ubiById[String(link.id_ubicacion)];
      const reportsVigente = link.reportes_vigente || 0;
      const reportsCaduco = link.reportes_caduco || 0;
      const officialActive = link.activa_oficial !== false;
      return {
        ...link,
        reportsVigente,
        reportsCaduco,
        officialActive,
        crowdStatus: crowdStatus({
          officialActive,
          reportsVigente,
          reportsCaduco,
        }),
        ubicacion: u
          ? {
              _id: u._id,
              nombre: u.nombre,
              lat: u.lat,
              long: u.long,
              calle: u.calle,
              colonia: u.colonia,
            }
          : null,
      };
    });
    res.json({ count: enriched.length, links: enriched });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}
