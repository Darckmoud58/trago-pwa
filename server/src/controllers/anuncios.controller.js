import mongoose from 'mongoose';
import Anuncio, { ANUNCIO_SLOTS } from '../models/Anuncio.js';
import Empresa from '../models/Empresa.js';
import Suscripcion from '../models/Suscripcion.js';
import {
  findActivePautaSub,
  mapSuscripcion,
  puedePauta,
} from '../lib/pauta.js';
import { sanitizeHttpUrl } from '../lib/safeUrl.js';

function clipStr(raw, max = 500) {
  return String(raw ?? '').trim().slice(0, max);
}

function mapAnuncio(a, empresaById = {}) {
  if (!a) return null;
  const emp = empresaById[String(a.id_empresa)] || {};
  return {
    _id: a._id,
    id_empresa: a.id_empresa,
    titulo: a.titulo,
    copy: a.copy || '',
    imagen_url: a.imagen_url || '',
    url_destino: a.url_destino || '',
    inicia: a.inicia,
    termina: a.termina,
    zonas: a.zonas || [],
    slot: a.slot,
    estatus: a.estatus,
    alcohol: Boolean(a.alcohol),
    impresiones: a.impresiones || 0,
    clics: a.clics || 0,
    chainName: emp.nombre || '',
    label: 'Patrocinado',
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

async function requirePauta(req) {
  const empresa = assertOwnEmpresa(req);
  if (req.isAdmin) return { empresa, sub: await findActivePautaSub(empresa._id) };
  const sub = await findActivePautaSub(empresa._id);
  if (!puedePauta(empresa, sub)) {
    const err = new Error('NO_PAUTA');
    err.status = 402;
    err.message =
      'Necesitas una suscripción de pauta activa para gestionar anuncios.';
    throw err;
  }
  return { empresa, sub };
}

/** Adjunta suscripción + anuncios a GET /api/cadena/me */
export async function enrichCadenaMeAds(empresa) {
  if (!empresa) {
    return {
      suscripcion: null,
      puedePauta: false,
      anuncios: [],
    };
  }
  const [sub, anuncios, pending] = await Promise.all([
    findActivePautaSub(empresa._id),
    Anuncio.find({ id_empresa: empresa._id }).sort({ updatedAt: -1 }).lean(),
    Suscripcion.findOne({
      id_empresa: empresa._id,
      estatus: 'pending',
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  const activeOrPending = sub || pending;
  return {
    suscripcion: mapSuscripcion(activeOrPending),
    puedePauta: puedePauta(empresa, sub),
    anuncios: anuncios.map((a) => mapAnuncio(a, { [String(empresa._id)]: empresa })),
  };
}

/** GET /api/cadena/anuncios */
export async function listCadenaAnuncios(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    const anuncios = await Anuncio.find({ id_empresa: empresa._id })
      .sort({ updatedAt: -1 })
      .lean();
    const sub = await findActivePautaSub(empresa._id);
    return res.json({
      puedePauta: puedePauta(empresa, sub),
      suscripcion: mapSuscripcion(sub),
      anuncios: anuncios.map((a) =>
        mapAnuncio(a, { [String(empresa._id)]: empresa })
      ),
    });
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    console.error('listCadenaAnuncios:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/anuncios — crea borrador */
export async function createAnuncio(req, res) {
  try {
    const { empresa } = await requirePauta(req);
    const titulo = clipStr(req.body.titulo || req.body.title, 120);
    if (!titulo) {
      return res.status(400).json({ message: 'titulo es requerido' });
    }
    const slot = ANUNCIO_SLOTS.includes(req.body.slot)
      ? req.body.slot
      : 'home_rail';
    const zonasRaw = req.body.zonas;
    const zonas = Array.isArray(zonasRaw)
      ? zonasRaw.map((z) => clipStr(z, 32).toLowerCase()).filter(Boolean)
      : ['gdl'];

    const doc = await Anuncio.create({
      id_empresa: empresa._id,
      titulo,
      copy: clipStr(req.body.copy || req.body.descripcion, 280),
      imagen_url: sanitizeHttpUrl(req.body.imagen_url || req.body.imagen),
      url_destino: sanitizeHttpUrl(req.body.url_destino || req.body.url),
      inicia: req.body.inicia ? new Date(req.body.inicia) : null,
      termina: req.body.termina ? new Date(req.body.termina) : null,
      zonas: zonas.length ? zonas : ['gdl'],
      slot,
      estatus: 'borrador',
      alcohol: Boolean(req.body.alcohol),
    });

    return res.status(201).json({
      anuncio: mapAnuncio(doc.toObject(), {
        [String(empresa._id)]: empresa,
      }),
    });
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    if (e.status === 402) {
      return res.status(402).json({ message: e.message });
    }
    console.error('createAnuncio:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** PUT /api/cadena/anuncios/:id */
export async function updateAnuncio(req, res) {
  try {
    const { empresa } = await requirePauta(req);
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido' });
    }
    const doc = await Anuncio.findOne({ _id: id, id_empresa: empresa._id });
    if (!doc) {
      return res.status(404).json({ message: 'Anuncio no encontrado' });
    }

    if (req.body.titulo != null || req.body.title != null) {
      const titulo = clipStr(req.body.titulo || req.body.title, 120);
      if (!titulo) {
        return res.status(400).json({ message: 'titulo vacío' });
      }
      doc.titulo = titulo;
    }
    if (req.body.copy != null || req.body.descripcion != null) {
      doc.copy = clipStr(req.body.copy || req.body.descripcion, 280);
    }
    if (req.body.imagen_url != null || req.body.imagen != null) {
      doc.imagen_url = sanitizeHttpUrl(
        req.body.imagen_url || req.body.imagen
      );
    }
    if (req.body.url_destino != null || req.body.url != null) {
      doc.url_destino = sanitizeHttpUrl(req.body.url_destino || req.body.url);
    }
    if (req.body.inicia !== undefined) {
      doc.inicia = req.body.inicia ? new Date(req.body.inicia) : null;
    }
    if (req.body.termina !== undefined) {
      doc.termina = req.body.termina ? new Date(req.body.termina) : null;
    }
    if (ANUNCIO_SLOTS.includes(req.body.slot)) {
      doc.slot = req.body.slot;
    }
    if (Array.isArray(req.body.zonas)) {
      const zonas = req.body.zonas
        .map((z) => clipStr(z, 32).toLowerCase())
        .filter(Boolean);
      doc.zonas = zonas.length ? zonas : ['gdl'];
    }
    if (req.body.alcohol != null) {
      doc.alcohol = Boolean(req.body.alcohol);
    }
    if (req.body.estatus === 'pausado' || req.body.estatus === 'borrador') {
      doc.estatus = req.body.estatus;
    }

    await doc.save();
    return res.json({
      anuncio: mapAnuncio(doc.toObject(), {
        [String(empresa._id)]: empresa,
      }),
    });
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    if (e.status === 402) {
      return res.status(402).json({ message: e.message });
    }
    console.error('updateAnuncio:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/anuncios/:id/activar */
export async function activateAnuncio(req, res) {
  try {
    const { empresa } = await requirePauta(req);
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido' });
    }
    const doc = await Anuncio.findOne({ _id: id, id_empresa: empresa._id });
    if (!doc) {
      return res.status(404).json({ message: 'Anuncio no encontrado' });
    }
    if (!doc.titulo) {
      return res.status(400).json({ message: 'El anuncio necesita título' });
    }
    doc.estatus = 'activo';
    if (!doc.inicia) doc.inicia = new Date();
    await doc.save();
    return res.json({
      anuncio: mapAnuncio(doc.toObject(), {
        [String(empresa._id)]: empresa,
      }),
    });
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    if (e.status === 402) {
      return res.status(402).json({ message: e.message });
    }
    console.error('activateAnuncio:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/suscripcion/solicitar — piloto */
export async function solicitarSuscripcion(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    const plan = ['basic', 'campaign', 'pro', 'premium'].includes(req.body.plan)
      ? req.body.plan
      : 'basic';

    const existingActive = await findActivePautaSub(empresa._id);
    if (existingActive) {
      return res.json({
        suscripcion: mapSuscripcion(existingActive),
        message: 'Ya tienes una suscripción de pauta activa.',
      });
    }

    const pending = await Suscripcion.findOne({
      id_empresa: empresa._id,
      estatus: 'pending',
    }).lean();
    if (pending) {
      return res.json({
        suscripcion: mapSuscripcion(pending),
        message: 'Ya hay una solicitud pendiente. Un admin la activará.',
      });
    }

    const sub = await Suscripcion.create({
      id_empresa: empresa._id,
      plan,
      inicia: new Date(),
      termina: null,
      activo: false,
      estatus: 'pending',
      origen: 'solicitud',
      notas: clipStr(req.body.notas, 500),
    });

    return res.status(201).json({
      suscripcion: mapSuscripcion(sub.toObject()),
      message:
        'Solicitud registrada. Te activamos la pauta cuando confirmemos el pago del piloto.',
    });
  } catch (e) {
    if (e.status === 404) {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    console.error('solicitarSuscripcion:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/**
 * POST /api/admin/suscripciones
 * body: { empresaId, plan, dias?, activo?, notas? }
 */
export async function adminUpsertSuscripcion(req, res) {
  try {
    const empresaId = req.body.empresaId || req.body.id_empresa;
    if (!mongoose.isValidObjectId(empresaId)) {
      return res.status(400).json({ message: 'empresaId inválido' });
    }
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    const plan = ['basic', 'campaign', 'pro', 'premium', 'freemium'].includes(
      req.body.plan
    )
      ? req.body.plan
      : 'basic';
    const dias = Number(req.body.dias);
    const inicia = req.body.inicia ? new Date(req.body.inicia) : new Date();
    let termina = req.body.termina ? new Date(req.body.termina) : null;
    if (!termina && Number.isFinite(dias) && dias > 0) {
      termina = new Date(inicia.getTime() + dias * 24 * 60 * 60 * 1000);
    }
    const activo =
      req.body.activo === undefined ? true : Boolean(req.body.activo);

    // Cierra pendientes previas
    await Suscripcion.updateMany(
      { id_empresa: empresa._id, estatus: 'pending' },
      { $set: { estatus: 'cancelado', activo: false } }
    );

    const sub = await Suscripcion.create({
      id_empresa: empresa._id,
      plan,
      inicia,
      termina,
      activo,
      estatus: activo ? 'activo' : 'pending',
      origen: 'manual',
      notas: clipStr(req.body.notas, 500),
    });

    const pautaPlan =
      plan === 'campaign' ? 'campaign' : plan === 'freemium' ? 'none' : 'basic';
    empresa.plan_pauta = activo ? pautaPlan : 'none';
    if (plan === 'pro' || plan === 'premium') {
      empresa.plan = plan === 'premium' ? 'premium' : 'pro';
    }
    await empresa.save();

    return res.status(201).json({
      suscripcion: mapSuscripcion(sub.toObject()),
      empresa: {
        _id: empresa._id,
        plan: empresa.plan,
        plan_pauta: empresa.plan_pauta,
      },
    });
  } catch (e) {
    console.error('adminUpsertSuscripcion:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** GET /api/anuncios/serving?slot=&zona= */
export async function serveAnuncios(req, res) {
  try {
    const slot = ANUNCIO_SLOTS.includes(req.query.slot)
      ? req.query.slot
      : null;
    const zona = clipStr(req.query.zona || 'gdl', 32).toLowerCase() || 'gdl';
    const now = new Date();

    const filter = {
      estatus: 'activo',
      $and: [
        { $or: [{ inicia: null }, { inicia: { $lte: now } }] },
        { $or: [{ termina: null }, { termina: { $gte: now } }] },
        {
          $or: [{ zonas: zona }, { zonas: { $size: 0 } }, { zonas: 'all' }],
        },
      ],
    };
    if (slot) filter.slot = slot;

    const rows = await Anuncio.find(filter)
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    if (!rows.length) {
      return res.json({ anuncios: [] });
    }

    const empresaIds = [
      ...new Set(rows.map((r) => String(r.id_empresa)).filter(Boolean)),
    ];
    const empresas = await Empresa.find({
      _id: { $in: empresaIds },
      estatus: 'activo',
    })
      .select('nombre plan_pauta')
      .lean();
    const empresaById = Object.fromEntries(
      empresas.map((e) => [String(e._id), e])
    );

    const subs = await Suscripcion.find({
      id_empresa: { $in: empresaIds },
      activo: true,
      estatus: 'activo',
      $and: [
        { $or: [{ inicia: null }, { inicia: { $lte: now } }] },
        { $or: [{ termina: null }, { termina: { $gte: now } }] },
      ],
    }).lean();
    const subByEmpresa = {};
    for (const s of subs) {
      const k = String(s.id_empresa);
      if (!subByEmpresa[k]) subByEmpresa[k] = s;
    }

    const allowed = [];
    for (const row of rows) {
      const emp = empresaById[String(row.id_empresa)];
      if (!emp) continue;
      if (!puedePauta(emp, subByEmpresa[String(emp._id)])) continue;
      allowed.push(mapAnuncio(row, empresaById));
    }

    return res.json({ anuncios: allowed.slice(0, 3) });
  } catch (e) {
    console.error('serveAnuncios:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/anuncios/:id/evento  body: { tipo: impression|click } */
export async function trackAnuncioEvento(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido' });
    }
    const tipo = String(req.body.tipo || req.body.type || '').toLowerCase();
    if (tipo !== 'impression' && tipo !== 'click') {
      return res.status(400).json({ message: 'tipo debe ser impression o click' });
    }
    const field = tipo === 'click' ? 'clics' : 'impresiones';
    const updated = await Anuncio.findOneAndUpdate(
      { _id: id, estatus: 'activo' },
      { $inc: { [field]: 1 } },
      { new: true }
    ).lean();
    if (!updated) {
      return res.status(404).json({ message: 'Anuncio no encontrado' });
    }
    return res.json({ ok: true, _id: updated._id, [field]: updated[field] });
  } catch (e) {
    console.error('trackAnuncioEvento:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
