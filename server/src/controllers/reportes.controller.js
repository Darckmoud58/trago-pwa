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
      Usuario.findById(req.userId).lean(),
      Promocion.findById(promoId).lean(),
      Ubicacion.findById(ubicacionId).lean(),
      PromoUbicacion.findOne({ id_promo: promoId, id_ubicacion: ubicacionId }).lean(),
    ]);

    if (!user || user.estatus !== 'activo') {
      return res.status(401).json({ message: 'Usuario no válido' });
    }
    if (!promo || promo.estatus !== 'activo') {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }
    if (!ubicacion) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }
    if (!link || link.activa_oficial === false) {
      return res.status(400).json({
        message: 'Esta sucursal no participa en la promo (sin vínculo oficial).',
      });
    }
    if (promo.alcohol || promo.audiencia === 'adulto') {
      if ((user.edad ?? 0) < 18) {
        return res.status(403).json({
          message: 'Solo mayores de 18 pueden reportar vigencia de promos con alcohol.',
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
    const prev = await ReporteVigencia.findOne({
      id_usuario: user._id,
      id_promo: promoId,
      id_ubicacion: ubicacionId,
    }).lean();
    if (!prev) {
      const recent = await ReporteVigencia.countDocuments({
        id_usuario: user._id,
        updatedAt: { $gte: hourAgo },
      });
      if (recent >= VOTES_PER_HOUR) {
        return res.status(429).json({
          message: 'Demasiados reportes en una hora. Intenta más tarde.',
        });
      }
    }

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
        },
        $setOnInsert: {
          id_usuario: user._id,
          id_promo: promoId,
          id_ubicacion: ubicacionId,
        },
      },
      { upsert: true, new: true }
    );

    // Nunca toca activa_oficial ni el folio de la promo.
    const { yes, no } = await recountLink(promoId, ubicacionId);
    const status = crowdStatus({
      officialActive: true,
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
    });
  } catch (e) {
    console.error('postReport:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
