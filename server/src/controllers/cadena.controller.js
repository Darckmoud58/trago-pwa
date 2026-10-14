import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Empresa from '../models/Empresa.js';
import Ubicacion from '../models/Ubicacion.js';
import Promocion from '../models/Promocion.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import { uniqueSlug } from '../lib/slugify.js';

function mapEmpresa(e) {
  if (!e) return null;
  return {
    ...e,
    name: e.nombre,
    description: e.descripcion,
    verified: e.verificada,
    ownerId: e.id_dueno,
  };
}

function assertOwnEmpresa(req) {
  if (!req.empresa) {
    const err = new Error('NO_EMPRESA');
    err.status = 404;
    throw err;
  }
  return req.empresa;
}

async function countLinks(promoId) {
  return PromoUbicacion.countDocuments({
    id_promo: promoId,
    activa_oficial: true,
  });
}

/** GET /api/cadena/me — empresa del usuario + promos + sucursales */
export async function getCadenaMe(req, res) {
  try {
    const empresa = req.empresa;
    if (!empresa) {
      return res.json({
        empresa: null,
        message: 'Aún no tienes cadena. Regístrala en POST /api/cadena/registro.',
        promociones: [],
        sucursales: [],
      });
    }

    const [promos, sucursales] = await Promise.all([
      Promocion.find({ id_empresa: empresa._id }).sort({ updatedAt: -1 }).lean(),
      Ubicacion.find({ id_empresa: empresa._id, estatus: 'activo' })
        .sort({ nombre: 1 })
        .lean(),
    ]);

    const promoIds = promos.map((p) => p._id);
    const links = promoIds.length
      ? await PromoUbicacion.find({ id_promo: { $in: promoIds } }).lean()
      : [];
    const linkCountByPromo = {};
    for (const l of links) {
      const k = String(l.id_promo);
      linkCountByPromo[k] = (linkCountByPromo[k] || 0) + 1;
    }

    return res.json({
      empresa: mapEmpresa(empresa),
      promociones: promos.map((p) => ({
        ...p,
        title: p.nombre,
        sucursalesAsignadas: linkCountByPromo[String(p._id)] || 0,
        publicada:
          p.estatus === 'activo' &&
          (linkCountByPromo[String(p._id)] || 0) > 0 &&
          (p.origen === 'oficial' ||
            (p.origen === 'empresa' && empresa.verificada)),
      })),
      sucursales: sucursales.map((u) => ({
        ...u,
        name: u.nombre || u.calle,
        address: [u.calle, u.num_ext, u.colonia].filter(Boolean).join(' '),
      })),
    });
  } catch (e) {
    console.error('getCadenaMe:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/**
 * POST /api/cadena/registro
 * Crea empresa y asigna rol empresa al usuario (si aún es user).
 */
export async function registerCadena(req, res) {
  try {
    const existing = await Empresa.findOne({ id_dueno: req.userId }).lean();
    if (existing) {
      return res.status(409).json({
        message: 'Ya tienes una cadena registrada',
        empresa: mapEmpresa(existing),
      });
    }

    const nombre = String(req.body.nombre || req.body.name || '').trim();
    if (!nombre) {
      return res.status(400).json({ message: 'nombre de la cadena es requerido' });
    }

    const slug = await uniqueSlug(Empresa, req.body.slug || nombre);
    const autoVerify =
      process.env.TRAGO_AUTO_VERIFY_CHAIN === 'true' ||
      process.env.TRAGO_AUTO_VERIFY_CHAIN === '1';

    const empresa = await Empresa.create({
      nombre,
      descripcion: String(req.body.descripcion || req.body.description || ''),
      sitio_web: String(req.body.sitio_web || req.body.website || ''),
      imagen: String(req.body.imagen || ''),
      slug,
      id_dueno: req.userId,
      verificada: autoVerify,
      plan: 'freemium',
      estatus: 'activo',
    });

    const roleEmpresa = await Rol.findOne({
      codigo: { $in: ['empresa', 'chain'] },
      estatus: 'activo',
    });
    let token = null;
    if (roleEmpresa) {
      await Usuario.findByIdAndUpdate(req.userId, { id_rol: roleEmpresa._id });
      token = jwt.sign(
        { id: req.userId, role: roleEmpresa.codigo },
        process.env.JWT_SECRET || 'changeme',
        { expiresIn: '7d' }
      );
      await Usuario.findByIdAndUpdate(req.userId, { token_login: token });
    }

    return res.status(201).json({
      empresa: mapEmpresa(empresa.toObject()),
      token,
      message: autoVerify
        ? 'Cadena creada y verificada (auto).'
        : 'Cadena creada. Un admin debe verificarla para que sus promos entren al catálogo público.',
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Slug de cadena ya existe' });
    }
    console.error('registerCadena:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/sucursales */
export async function createSucursal(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng ?? req.body.long);
    const calle = String(req.body.calle || req.body.address || '').trim();
    const nombre = String(req.body.nombre || req.body.name || calle || 'Sucursal').trim();

    if (!calle) {
      return res.status(400).json({ message: 'calle es requerida' });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'lat y lng válidos son requeridos' });
    }

    const slug = await uniqueSlug(Ubicacion, req.body.slug || `${empresa.slug}-${nombre}`);
    const doc = await Ubicacion.create({
      nombre,
      slug,
      calle,
      num_ext: String(req.body.num_ext || ''),
      colonia: String(req.body.colonia || ''),
      municipio: String(req.body.municipio || req.body.city || 'Guadalajara'),
      estado: String(req.body.estado || 'Jalisco'),
      lat,
      long: lng,
      location: { type: 'Point', coordinates: [lng, lat] },
      id_empresa: empresa._id,
      horario: String(req.body.horario || req.body.hours || ''),
      imagen: String(req.body.imagen || ''),
      estatus: 'activo',
    });

    return res.status(201).json({ sucursal: doc });
  } catch (e) {
    if (e.status === 404 || e.message === 'NO_EMPRESA') {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    console.error('createSucursal:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/promociones — origen empresa; no publica sin sucursales */
export async function createPromo(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    const nombre = String(req.body.nombre || req.body.title || '').trim();
    if (!nombre) {
      return res.status(400).json({ message: 'nombre de la promo es requerido' });
    }

    const ubicacionIds = Array.isArray(req.body.ubicacionIds)
      ? req.body.ubicacionIds.filter((id) => mongoose.isValidObjectId(id))
      : [];

    // Validar que las sucursales sean de su empresa
    let ownedUbis = [];
    if (ubicacionIds.length) {
      ownedUbis = await Ubicacion.find({
        _id: { $in: ubicacionIds },
        id_empresa: empresa._id,
        estatus: 'activo',
      }).lean();
      if (ownedUbis.length !== ubicacionIds.length) {
        return res.status(400).json({
          message: 'Una o más sucursales no pertenecen a tu cadena',
        });
      }
    }

    const slug = await uniqueSlug(Promocion, req.body.slug || nombre);
    const hasBranches = ownedUbis.length > 0;
    // Sin sucursales → borrador (inactivo); con sucursales → activo
    const estatus = hasBranches ? 'activo' : 'inactivo';

    const promo = await Promocion.create({
      nombre,
      slug,
      descripcion: String(req.body.descripcion || req.body.subtitle || ''),
      politicas: String(req.body.politicas || req.body.terms || ''),
      imagen: String(req.body.imagen || req.body.imageUrl || ''),
      origen: 'empresa',
      url_fuente: String(req.body.url_fuente || ''),
      id_empresa: empresa._id,
      inicia_en: req.body.inicia_en || req.body.startsAt || null,
      termina_en: req.body.termina_en || req.body.endsAt || null,
      alcohol: Boolean(req.body.alcohol),
      nocturno: Boolean(req.body.nocturno || req.body.isNocturno),
      cumpleanos: Boolean(req.body.cumpleanos || req.body.isBirthday),
      audiencia: req.body.alcohol || req.body.audiencia === 'adulto' ? 'adulto' : 'todos',
      destacada: Boolean(req.body.destacada || req.body.featured),
      estatus,
      puntos: Number(req.body.puntos) || 0,
    });

    if (hasBranches) {
      await PromoUbicacion.insertMany(
        ownedUbis.map((u) => ({
          id_promo: promo._id,
          id_ubicacion: u._id,
          activa_oficial: true,
          reportes_vigente: 0,
          reportes_caduco: 0,
          origen_vinculo: 'empresa',
          especificado_por_fuente: false,
        }))
      );
    }

    return res.status(201).json({
      promo,
      sucursalesAsignadas: ownedUbis.length,
      publicada: hasBranches && empresa.verificada && estatus === 'activo',
      message: !hasBranches
        ? 'Promo guardada como borrador: asigna al menos una sucursal para publicar.'
        : !empresa.verificada
          ? 'Promo activa en tus sucursales; el catálogo público espera verificación de la cadena.'
          : 'Promo publicada en el catálogo.',
    });
  } catch (e) {
    if (e.status === 404 || e.message === 'NO_EMPRESA') {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Slug de promo ya existe' });
    }
    console.error('createPromo:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** PUT /api/cadena/promociones/:id */
export async function updatePromo(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido' });
    }

    const promo = await Promocion.findOne({ _id: id, id_empresa: empresa._id });
    if (!promo) {
      return res.status(404).json({ message: 'Promo no encontrada o no es tuya' });
    }

    const fields = [
      'nombre',
      'descripcion',
      'politicas',
      'imagen',
      'url_fuente',
      'alcohol',
      'nocturno',
      'cumpleanos',
      'destacada',
      'puntos',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) promo[f] = req.body[f];
    }
    if (req.body.title) promo.nombre = req.body.title;
    if (req.body.subtitle) promo.descripcion = req.body.subtitle;
    if (req.body.startsAt !== undefined) promo.inicia_en = req.body.startsAt;
    if (req.body.endsAt !== undefined) promo.termina_en = req.body.endsAt;
    if (req.body.inicia_en !== undefined) promo.inicia_en = req.body.inicia_en;
    if (req.body.termina_en !== undefined) promo.termina_en = req.body.termina_en;
    if (req.body.audiencia) promo.audiencia = req.body.audiencia;
    if (promo.alcohol) promo.audiencia = 'adulto';

    // Reasignar sucursales si vienen ubicacionIds
    if (Array.isArray(req.body.ubicacionIds)) {
      const ubicacionIds = req.body.ubicacionIds.filter((x) =>
        mongoose.isValidObjectId(x)
      );
      const ownedUbis = await Ubicacion.find({
        _id: { $in: ubicacionIds },
        id_empresa: empresa._id,
        estatus: 'activo',
      }).lean();
      if (ownedUbis.length !== ubicacionIds.length) {
        return res.status(400).json({
          message: 'Una o más sucursales no pertenecen a tu cadena',
        });
      }
      await PromoUbicacion.deleteMany({ id_promo: promo._id });
      if (ownedUbis.length) {
        await PromoUbicacion.insertMany(
          ownedUbis.map((u) => ({
            id_promo: promo._id,
            id_ubicacion: u._id,
            activa_oficial: true,
            reportes_vigente: 0,
            reportes_caduco: 0,
            origen_vinculo: 'empresa',
            especificado_por_fuente: false,
          }))
        );
        promo.estatus = 'activo';
      } else {
        promo.estatus = 'inactivo';
      }
    } else {
      const n = await countLinks(promo._id);
      if (n === 0) promo.estatus = 'inactivo';
    }

    if (req.body.estatus && ['activo', 'inactivo', 'caduco'].includes(req.body.estatus)) {
      const n = await countLinks(promo._id);
      if (req.body.estatus === 'activo' && n === 0) {
        return res.status(400).json({
          message: 'No se puede publicar sin sucursales asignadas',
        });
      }
      promo.estatus = req.body.estatus;
    }

    await promo.save();
    const sucursalesAsignadas = await countLinks(promo._id);

    return res.json({
      promo,
      sucursalesAsignadas,
      publicada:
        promo.estatus === 'activo' &&
        sucursalesAsignadas > 0 &&
        empresa.verificada,
    });
  } catch (e) {
    if (e.status === 404 || e.message === 'NO_EMPRESA') {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    console.error('updatePromo:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/promociones/:id/sucursales — body: { ubicacionIds: [] } */
export async function setPromoSucursales(req, res) {
  req.body.ubicacionIds = req.body.ubicacionIds || req.body.sucursalIds || [];
  return updatePromo(req, res);
}

/** POST /api/cadena/admin/verificar — admin marca verificada */
export async function verifyEmpresa(req, res) {
  try {
    const empresaId = req.body.empresaId || req.params.id;
    if (!mongoose.isValidObjectId(empresaId)) {
      return res.status(400).json({ message: 'empresaId inválido' });
    }
    const verificada =
      req.body.verificada === undefined ? true : Boolean(req.body.verificada);
    const empresa = await Empresa.findByIdAndUpdate(
      empresaId,
      { $set: { verificada } },
      { new: true }
    ).lean();
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }
    return res.json({ empresa: mapEmpresa(empresa) });
  } catch (e) {
    console.error('verifyEmpresa:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
