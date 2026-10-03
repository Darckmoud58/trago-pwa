import mongoose from 'mongoose';
import Promocion from '../models/Promocion.js';
import Ubicacion from '../models/Ubicacion.js';
import Empresa from '../models/Empresa.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import { collectNearbyPromos, hasOfficialPromoSource } from '../services/officialPromoCollector.js';
import { discoverNearbyBranches } from '../services/nearbyPlaces.js';

function mapPromo(p, empresaById = {}) {
  const emp = empresaById[String(p.id_empresa)] || {};
  return {
    ...p,
    // aliases front (Todo_pwa / UI previa)
    title: p.nombre,
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
    const empresaById = empresa
      ? { [String(empresa._id)]: empresa }
      : {};

    const links = await PromoUbicacion.find({ id_promo: promo._id }).lean();
    const ubicacionIds = links.map((l) => l.id_ubicacion).filter(Boolean);
    const ubicaciones = ubicacionIds.length
      ? await Ubicacion.find({ _id: { $in: ubicacionIds } }).lean()
      : [];

    res.json({
      promo: mapPromo(promo, empresaById),
      ubicaciones: ubicaciones.map((u) => mapUbicacion(u, empresaById)),
    });
  } catch (e) {
    console.error('getPromo:', e.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

/** Listado público de promociones activas. */
export async function listPromos(_req, res) {
  try {
    const [promos, empresas] = await Promise.all([
      Promocion.find({ estatus: 'activo' })
        .sort({ destacada: -1, termina_en: 1 })
        .limit(100)
        .lean(),
      Empresa.find({}).lean(),
    ]);
    const empresaById = Object.fromEntries(empresas.map((e) => [String(e._id), e]));
    const mapped = promos.map((p) => mapPromo(p, empresaById));
    res.json({ count: mapped.length, promos: mapped });
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
    const branches = discovery.branches;
    const companyIds = [...new Set(branches.map((b) => b.id_empresa).filter(Boolean).map(String))];
    const companies = companyIds.length ? await Empresa.find({ _id: { $in: companyIds }, estatus: 'activo' }).lean() : [];
    const sourceCompanies = companies.filter((company) => hasOfficialPromoSource(company.slug));
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
    const promos = sourceCompanies.length ? await Promocion.find({
      id_empresa: { $in: sourceCompanies.map((c) => c._id) },
      origen: 'oficial',
      estatus: 'activo',
      $and: [
        { $or: [{ inicia_en: null }, { inicia_en: { $lte: now } }] },
        { $or: [{ termina_en: null }, { termina_en: { $gte: now } }] },
      ],
    }).sort({ destacada: -1, termina_en: 1 }).limit(100).lean() : [];
    const companyById = Object.fromEntries(companies.map((c) => [String(c._id), c]));
    const mapped = promos.map((promo) => ({
      ...mapPromo(promo, companyById),
      ubicacionesCercanas: branches.filter((b) => String(b.id_empresa) === String(promo.id_empresa)).map((b) => ({
        _id: b._id,
        nombre: b.nombre || b.calle,
        distanceMeters: b.distanceMeters,
        osmUrl: b.osmUrl,
      })),
    }));
    return res.json({
      count: mapped.length,
      radiusMeters: maxMeters,
      promos: mapped,
      sources,
      businessesFound: branches.length,
      searchedRadiusMeters: discovery.searchedRadiusMeters,
      partial: discovery.partial,
      businessesWithoutPromoSource: branches.filter((b) => !b.id_empresa).length + companies.length - sourceCompanies.length,
      locationSource: discovery.stale ? 'openstreetmap-cache-stale' : discovery.cached ? 'openstreetmap-cache' : 'openstreetmap',
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
    const mapped = discovery.branches.map((branch) => ({ ...branch, osmUrl: branch.osmUrl }));
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
    const links = await PromoUbicacion.find({ id_promo: promoId }).lean();
    res.json({ count: links.length, links });
  } catch (e) {
    res.status(500).json({ message: 'Error del servidor' });
  }
}
