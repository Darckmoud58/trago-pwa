import mongoose from 'mongoose';
import EventoMetrica, { METRICA_EVENT_TYPES } from '../models/EventoMetrica.js';
import Promocion from '../models/Promocion.js';
import {
  gpsOkMatchExtra,
  validateMetricEvent,
} from '../lib/metricasValidate.js';

const MAX_BATCH = 40;
/** Ventana de dedupe servidor: un mismo evento clave no se reinserta. */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

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

  const gpsMatch = {
    ...match,
    tipo: 'gps_ok',
    ...gpsOkMatchExtra(),
  };

  const [byType, sessionsGps, sessionsPromo, sessionsBranch] = await Promise.all([
    EventoMetrica.aggregate([
      { $match: match },
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
    ]),
    EventoMetrica.distinct('sessionId', gpsMatch),
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

  const counts = Object.fromEntries(METRICA_EVENT_TYPES.map((t) => [t, 0]));
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
      'Métrica norte = sesiones distintas con gps_ok (coords MX) + promo_open + sucursal_vista (no likes).',
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

    const validated = [];
    let rejected = 0;
    for (const ev of raw) {
      const result = validateMetricEvent(ev, { promoEmpresa });
      if (!result.ok) {
        rejected += 1;
        continue;
      }
      validated.push(result.doc);
    }

    if (!validated.length) {
      return res.status(400).json({
        message: 'Ningún evento válido',
        rejected,
      });
    }

    // Dedupe en ventana 24h (anti-contaminación de la norte).
    const sinceDedupe = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const existing = await EventoMetrica.find({
      createdAt: { $gte: sinceDedupe },
      sessionId: { $in: [...new Set(validated.map((d) => d.sessionId))] },
      tipo: { $in: [...new Set(validated.map((d) => d.tipo))] },
    })
      .select('sessionId tipo id_promo id_ubicacion')
      .lean();

    const seen = new Set(
      existing.map(
        (e) =>
          `${e.sessionId}|${e.tipo}|${e.id_promo || ''}|${e.id_ubicacion || ''}`
      )
    );

    const docs = [];
    const batchSeen = new Set();
    for (const d of validated) {
      if (seen.has(d.dedupeKey) || batchSeen.has(d.dedupeKey)) {
        rejected += 1;
        continue;
      }
      batchSeen.add(d.dedupeKey);
      seen.add(d.dedupeKey);
      docs.push({
        tipo: d.tipo,
        sessionId: d.sessionId,
        id_usuario: req.userId || null,
        id_promo: d.id_promo,
        id_ubicacion: d.id_ubicacion,
        id_empresa: d.id_empresa,
        lat: d.lat,
        lng: d.lng,
        path: d.path,
        meta: d.meta,
      });
    }

    if (!docs.length) {
      return res.status(200).json({
        ok: true,
        accepted: 0,
        rejected,
        deduped: true,
      });
    }

    await EventoMetrica.insertMany(docs, { ordered: false });
    return res.status(201).json({
      ok: true,
      accepted: docs.length,
      rejected,
    });
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
