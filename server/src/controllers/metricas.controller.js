import mongoose from 'mongoose';
import EventoMetrica, { METRICA_EVENT_TYPES } from '../models/EventoMetrica.js';
import Promocion from '../models/Promocion.js';

const MAX_BATCH = 40;

function parseDays(raw) {
  const n = Number(raw || 7);
  if (!Number.isFinite(n)) return 7;
  return Math.min(Math.max(Math.floor(n), 1), 90);
}

function sinceDate(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function aggregateNorthStar({ since, empresaId = null }) {
  const match = { createdAt: { $gte: since } };
  if (empresaId) match.id_empresa = new mongoose.Types.ObjectId(String(empresaId));

  const [byType, sessionsGps, sessionsPromo, sessionsBranch] = await Promise.all([
    EventoMetrica.aggregate([
      { $match: match },
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
    ]),
    EventoMetrica.distinct('sessionId', { ...match, tipo: 'gps_ok' }),
    EventoMetrica.distinct('sessionId', { ...match, tipo: 'promo_open' }),
    EventoMetrica.distinct('sessionId', { ...match, tipo: 'sucursal_vista' }),
  ]);

  const gpsSet = new Set(sessionsGps.map(String));
  const promoSet = new Set(sessionsPromo.map(String));
  const branchSet = new Set(sessionsBranch.map(String));

  let northStarSessions = 0;
  for (const sid of gpsSet) {
    if (promoSet.has(sid) && branchSet.has(sid)) northStarSessions += 1;
  }

  const counts = Object.fromEntries(
    METRICA_EVENT_TYPES.map((t) => [t, 0])
  );
  for (const row of byType) {
    if (row._id in counts) counts[row._id] = row.count;
  }

  return {
    since,
    counts,
    sessions: {
      gpsOk: gpsSet.size,
      promoOpen: promoSet.size,
      sucursalVista: branchSet.size,
      northStar: northStarSessions,
    },
    /** Embudo: % de sesiones GPS que llegan a promo y a sucursal. */
    funnel: {
      gpsToPromo:
        gpsSet.size === 0
          ? 0
          : Math.round(
              (1000 * [...gpsSet].filter((s) => promoSet.has(s)).length) /
                gpsSet.size
            ) / 10,
      gpsToBranch:
        gpsSet.size === 0
          ? 0
          : Math.round((1000 * northStarSessions) / gpsSet.size) / 10,
      promoToBranch:
        promoSet.size === 0
          ? 0
          : Math.round(
              (1000 *
                [...promoSet].filter((s) => branchSet.has(s)).length) /
                promoSet.size
            ) / 10,
    },
    definition:
      'Métrica norte = sesiones distintas con gps_ok + promo_open + sucursal_vista (no likes).',
  };
}

export async function postEvents(req, res) {
  try {
    const raw = Array.isArray(req.body?.events)
      ? req.body.events
      : req.body?.tipo
        ? [req.body]
        : [];

    if (!raw.length) {
      return res.status(400).json({ message: 'events[] o un evento con tipo es requerido' });
    }
    if (raw.length > MAX_BATCH) {
      return res.status(400).json({ message: `Máximo ${MAX_BATCH} eventos por request` });
    }

    const promoIds = [
      ...new Set(
        raw
          .map((ev) => ev.promoId)
          .filter((id) => id && mongoose.isValidObjectId(id))
          .map(String)
      ),
    ];
    const promoEmpresa = {};
    if (promoIds.length) {
      const promos = await Promocion.find({ _id: { $in: promoIds } })
        .select('_id id_empresa')
        .lean();
      for (const p of promos) {
        promoEmpresa[String(p._id)] = p.id_empresa;
      }
    }

    const docs = [];
    for (const ev of raw) {
      const tipo = String(ev.tipo || '').trim();
      if (!METRICA_EVENT_TYPES.includes(tipo)) continue;
      const sessionId = String(ev.sessionId || '').trim().slice(0, 80);
      if (!sessionId) continue;

      let id_promo = null;
      let id_ubicacion = null;
      let id_empresa = ev.empresaId || ev.id_empresa || null;

      if (ev.promoId && mongoose.isValidObjectId(ev.promoId)) {
        id_promo = ev.promoId;
        if (!id_empresa) id_empresa = promoEmpresa[String(ev.promoId)] || null;
      }
      if (ev.ubicacionId && mongoose.isValidObjectId(ev.ubicacionId)) {
        id_ubicacion = ev.ubicacionId;
      }

      const lat = Number(ev.lat);
      const lng = Number(ev.lng ?? ev.long);

      docs.push({
        tipo,
        sessionId,
        id_usuario: req.userId || null,
        id_promo,
        id_ubicacion,
        id_empresa: mongoose.isValidObjectId(id_empresa) ? id_empresa : null,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        path: String(ev.path || '').slice(0, 200),
        meta: typeof ev.meta === 'object' && ev.meta ? ev.meta : {},
      });
    }

    if (!docs.length) {
      return res.status(400).json({ message: 'Ningún evento válido' });
    }

    await EventoMetrica.insertMany(docs, { ordered: false });
    return res.status(201).json({ ok: true, accepted: docs.length });
  } catch (e) {
    console.error('postEvents:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function getNorthStar(req, res) {
  try {
    const days = parseDays(req.query.days);
    const since = sinceDate(days);
    const summary = await aggregateNorthStar({ since });
    return res.json({ days, ...summary });
  } catch (e) {
    console.error('getNorthStar:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function getCadenaMetricas(req, res) {
  try {
    if (!req.empresa?._id) {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    const days = parseDays(req.query.days);
    const since = sinceDate(days);
    const summary = await aggregateNorthStar({
      since,
      empresaId: req.empresa._id,
    });
    return res.json({
      days,
      empresaId: req.empresa._id,
      ...summary,
    });
  } catch (e) {
    console.error('getCadenaMetricas:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
