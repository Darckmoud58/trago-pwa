import mongoose from 'mongoose';
import Promocion from '../models/Promocion.js';
import Ubicacion from '../models/Ubicacion.js';
import PromoUbicacion from '../models/PromoUbicacion.js';
import Usuario from '../models/Usuario.js';
import ReporteVigencia from '../models/ReporteVigencia.js';
import {
  crowdStatus,
  distanceMeters,
  PRESENCE_MAX_METERS,
  voteCutoff,
  VOTES_PER_HOUR,
} from '../lib/validity.js';
import {
  FLIPFLOP_MAX_PER_DAY,
  MODERATION_COPY,
  voteBanStatus,
  VOTES_PER_DAY,
} from '../lib/moderation.js';
import { consumeRateLimit } from '../middleware/rateLimit.js';
import {
  MIN_ALCOHOL_AGE,
  isRestrictedPromo,
  resolveUserAge,
} from '../lib/ageGate.js';

async function recountLink(promoId, ubicacionId) {
  const cutoff = voteCutoff();
  const [yes, no] = await Promise.all([
    ReporteVigencia.countDocuments({
      id_promo: promoId,
      id_ubicacion: ubicacionId,
      sigue_vigente: true,
      updatedAt: { $gte: cutoff },
    }),
    ReporteVigencia.countDocuments({
      id_promo: promoId,
      id_ubicacion: ubicacionId,
      sigue_vigente: false,
      updatedAt: { $gte: cutoff },
    }),
  ]);
  const link = await PromoUbicacion.findOneAndUpdate(
    { id_promo: promoId, id_ubicacion: ubicacionId },
    { $set: { reportes_vigente: yes, reportes_caduco: no } },
    { new: true }
  ).lean();
  return { yes, no, link };
}

async function bumpAbuse(userId) {
  const until = new Date(Date.now() + 60 * 60 * 1000);
  await Usuario.findByIdAndUpdate(userId, {
    $inc: { reportes_abuso_count: 1 },
    $set: { reportes_bloqueado_hasta: until },
  });
  return until;
}

export async function getMyReport(req, res) {
  try {
    const promoId = req.query.promoId;
    const ubicacionId = req.query.ubicacionId || req.query.branchId;
    if (
      !mongoose.isValidObjectId(promoId) ||
      !mongoose.isValidObjectId(ubicacionId)
    ) {
      return res.status(400).json({ message: 'promoId y ubicacionId requeridos' });
    }
    const doc = await ReporteVigencia.findOne({
      id_usuario: req.userId,
      id_promo: promoId,
      id_ubicacion: ubicacionId,
    }).lean();
    return res.json({
      vote: doc ? doc.sigue_vigente : null,
      updatedAt: doc?.updatedAt || null,
      limits: MODERATION_COPY,
    });
  } catch (e) {
    console.error('getMyReport:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

export async function postReport(req, res) {
  try {
    const promoId = req.body.promoId;
    const ubicacionId = req.body.ubicacionId || req.body.branchId;
    const stillValid =
      typeof req.body.stillValid === 'boolean'
        ? req.body.stillValid
        : typeof req.body.sigue_vigente === 'boolean'
          ? req.body.sigue_vigente
          : null;
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng ?? req.body.long);

    if (
      !mongoose.isValidObjectId(promoId) ||
      !mongoose.isValidObjectId(ubicacionId) ||
      typeof stillValid !== 'boolean'
    ) {
      return res.status(400).json({
        message: 'promoId, ubicacionId y stillValid (boolean) son requeridos',
      });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        message: 'lat y lng del GPS son requeridos para votar en piso',
      });
    }

    const [user, promo, ubicacion, link] = await Promise.all([
      Usuario.findById(req.userId),
      Promocion.findById(promoId).lean(),
      Ubicacion.findById(ubicacionId).lean(),
      PromoUbicacion.findOne({ id_promo: promoId, id_ubicacion: ubicacionId }).lean(),
    ]);

    if (!user || user.estatus === 'inactivo') {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const ban = voteBanStatus(user);
    if (ban.banned) {
      return res.status(403).json({ message: ban.reason, until: ban.until || null });
    }

    // Ráfaga en memoria (anti-bot)
    const burst = await consumeRateLimit(
      `vote:${user._id}`,
      VOTES_PER_HOUR,
      60 * 60 * 1000
    );
    if (!burst.ok) {
      const until = await bumpAbuse(user._id);
      return res.status(429).json({
        message: `Demasiados reportes. Espera ${burst.retryAfterSec}s.`,
        retryAfterSec: burst.retryAfterSec,
        blockedUntil: until,
      });
    }

    if (!promo || promo.estatus !== 'activo') {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }
    if (!ubicacion) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }
    if (!link || link.activa_oficial === false) {
      return res.status(400).json({
        message: 'Esta sucursal no participa en la promo (sin vínculo oficial o pausada por la cadena).',
      });
    }
    if (isRestrictedPromo(promo)) {
      const age = resolveUserAge(user);
      if (age == null || age < MIN_ALCOHOL_AGE) {
        return res.status(403).json({
          code: 'AGE_RESTRICTED',
          message: `Solo mayores de ${MIN_ALCOHOL_AGE} pueden reportar vigencia de promos con alcohol o nocturno.`,
          minAge: MIN_ALCOHOL_AGE,
        });
      }
    }

    const meters = distanceMeters(
      { lat, lng },
      { lat: ubicacion.lat, lng: ubicacion.long }
    );
    if (meters > PRESENCE_MAX_METERS) {
      return res.status(403).json({
        message: `Hay que estar a menos de ${PRESENCE_MAX_METERS} m de la sucursal para reportar vigencia (estás a ${Math.round(meters)} m).`,
        distanceMeters: Math.round(meters),
        maxMeters: PRESENCE_MAX_METERS,
      });
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const prev = await ReporteVigencia.findOne({
      id_usuario: user._id,
      id_promo: promoId,
      id_ubicacion: ubicacionId,
    });

    if (!prev) {
      const [recentHour, recentDay] = await Promise.all([
        ReporteVigencia.countDocuments({
          id_usuario: user._id,
          updatedAt: { $gte: hourAgo },
        }),
        ReporteVigencia.countDocuments({
          id_usuario: user._id,
          createdAt: { $gte: dayAgo },
        }),
      ]);
      if (recentHour >= VOTES_PER_HOUR) {
        return res.status(429).json({
          message: 'Demasiados reportes en una hora. Intenta más tarde.',
          limits: MODERATION_COPY,
        });
      }
      if (recentDay >= VOTES_PER_DAY) {
        const until = await bumpAbuse(user._id);
        return res.status(429).json({
          message: `Límite diario de ${VOTES_PER_DAY} reportes. Vuelve mañana.`,
          blockedUntil: until,
          limits: MODERATION_COPY,
        });
      }
    } else if (prev.sigue_vigente !== stillValid) {
      // Flip-flop: contar cambios en ventana 24 h
      const flips = Number(prev.cambios_voto || 0);
      const lastFlip = prev.ultimo_cambio_en
        ? new Date(prev.ultimo_cambio_en)
        : null;
      const flipsInWindow =
        lastFlip && lastFlip >= dayAgo ? flips : 0;
      if (flipsInWindow >= FLIPFLOP_MAX_PER_DAY) {
        const until = await bumpAbuse(user._id);
        return res.status(429).json({
          message: `Demasiados cambios de voto en 24 h (máx ${FLIPFLOP_MAX_PER_DAY}). El voto matiza; no lo uses para trollar.`,
          blockedUntil: until,
          limits: MODERATION_COPY,
        });
      }
    }

    const now = new Date();
    const isFlip = Boolean(prev && prev.sigue_vigente !== stillValid);
    const flipsBase =
      prev && prev.ultimo_cambio_en && new Date(prev.ultimo_cambio_en) >= dayAgo
        ? Number(prev.cambios_voto || 0)
        : 0;

    await ReporteVigencia.findOneAndUpdate(
      {
        id_usuario: user._id,
        id_promo: promoId,
        id_ubicacion: ubicacionId,
      },
      {
        $set: {
          sigue_vigente: stillValid,
          lat,
          long: lng,
          distancia_m: Math.round(meters),
          ...(isFlip
            ? {
                cambios_voto: flipsBase + 1,
                ultimo_cambio_en: now,
              }
            : {}),
        },
        $setOnInsert: {
          id_usuario: user._id,
          id_promo: promoId,
          id_ubicacion: ubicacionId,
          cambios_voto: 0,
        },
      },
      { upsert: true, new: true }
    );

    // Nunca toca activa_oficial ni el folio de la promo.
    const { yes, no, link: liveLink } = await recountLink(promoId, ubicacionId);
    const status = crowdStatus({
      officialActive: liveLink?.activa_oficial !== false,
      reportsVigente: yes,
      reportsCaduco: no,
    });

    return res.json({
      ok: true,
      mine: stillValid,
      reportsVigente: yes,
      reportsCaduco: no,
      crowdStatus: status,
      distanceMeters: Math.round(meters),
      reafirmadoEn: liveLink?.reafirmado_en || null,
      limits: MODERATION_COPY,
      note:
        status === 'en_duda' || status === 'caduco'
          ? 'El voto matiza la sucursal; no borra el folio oficial. La cadena puede reafirmar.'
          : undefined,
    });
  } catch (e) {
    console.error('postReport:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
