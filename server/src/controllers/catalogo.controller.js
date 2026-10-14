import mongoose from 'mongoose';
import Promocion from '../models/Promocion.js';
import Ubicacion from '../models/Ubicacion.js';
import Empresa from '../models/Empresa.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import {
  collectNearbyPromos,
  ensureOfficialCompanies,
  hasOfficialPromoSource,
  officialSourceSlugs,
  resolveOfficialBrand,
} from '../services/officialPromoCollector.js';
import { getOfficialRefreshStatus } from '../services/officialPromoJob.js';
import { discoverNearbyBranches } from '../services/nearbyPlaces.js';
import { crowdStatus } from '../lib/validity.js';
import {
  enrichBranchesWithDistance,
  upsertCompanyBranchesFromOsm,
  vinculoMeta,
} from '../services/promoBranchLinks.js';

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
export async function listPromos(_req, res) {
  try {
    const now = new Date();
    const refresh = getOfficialRefreshStatus();
    const filter = await publicCatalogFilter(now);
    const promos = await Promocion.find(filter)
      .sort({ destacada: -1, termina_en: 1 })
      .limit(100)
      .lean();
    const empresaIds = [
      ...new Set(promos.map((p) => String(p.id_empresa)).filter(Boolean)),
    ];
    const empresas = empresaIds.length
      ? await Empresa.find({ _id: { $in: empresaIds } }).lean()
      : [];
    const empresaById = Object.fromEntries(
      empresas.map((e) => [String(e._id), e])
    );
    const mapped = promos.map((p) => mapPromo(p, empresaById));
    res.json({
      count: mapped.length,
      promos: mapped,
      sources: refresh.sources,
      sourcesRefreshedAt: refresh.at,
      emptyReason:
        mapped.length === 0
          ? 'Sin promociones oficiales guardadas aún. El recolector corre en segundo plano; vuelve en unos minutos o usa Cerca con GPS.'
          : null,
    });
  } catch (e) {
    console.error('listPromos:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}


/** Recolecta promociones oficiales de empresas que OSM ubica cerca del usuario. */
export async function nearbyPromos(req, res) {
  try {
    const lng = Number(req.query.lng ?? req.query.long);
    const lat = Number(req.query.lat);
    const maxMeters = Math.min(Math.max(Number(req.query.maxMeters || 8000), 250), 25000);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ message: 'Coordenadas lng y lat válidas son requeridas' });
    }

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

    let sources = [];
    try {
      sources = await collectNearbyPromos(sourceCompanies);
    } catch (sourceError) {
      console.error('nearbyPromos source refresh:', sourceError.message);
      sources = sourceCompanies.map((company) => ({
        empresa: company.nombre,
        ok: false,
        count: 0,
        reason: 'No se pudo actualizar la fuente; se mostrarán las promociones oficiales guardadas.',
      }));
    }
    const now = new Date();
    const promos = sourceCompanies.length
      ? await Promocion.find({
          ...officialPromoFilter(now),
          id_empresa: { $in: sourceCompanies.map((c) => c._id) },
        })
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
    const mapped = promos.map((promo) => {
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
    return res.json({
      count: mapped.length,
      radiusMeters: maxMeters,
      promos: mapped,
      sources,
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

/** Negocios, sucursales y restaurantes descubiertos alrededor del GPS con OpenStreetMap. */
export async function nearBranches(req, res) {
  try {
    const lng = Number(req.query.lng ?? req.query.long);
    const lat = Number(req.query.lat);
    const maxMeters = Math.min(Math.max(Number(req.query.maxMeters || 8000), 250), 25000);
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ message: 'Coordenadas lng y lat válidas son requeridas' });
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
      source: discovery.stale ? 'openstreetmap-cache-stale' : discovery.cached ? 'openstreetmap-cache' : 'openstreetmap',
      attribution: '© OpenStreetMap contributors',
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
