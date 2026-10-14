import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import {
  bandFromAge,
  canSeeRestricted,
  parseBand,
  resolveUserAge,
} from '../lib/ageGate.js';

/**
 * Auth opcional + banda de edad del visitante.
 * Prioridad: usuario autenticado (edad en DB) > header X-Trago-Band > query band.
 */
export async function attachViewerAge(req, _res, next) {
  req.viewer = {
    userId: null,
    age: null,
    band: null,
    source: 'unknown',
    canSeeAlcohol: true,
  };

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
      req.userId = payload.id;
      req.role = payload.role;
      const user = await Usuario.findById(payload.id)
        .select('edad fecha_nacimiento estatus')
        .lean();
      if (user && user.estatus === 'activo') {
        const age = resolveUserAge(user);
        const band = bandFromAge(age) || parseBand(payload.band);
        req.viewer = {
          userId: user._id,
          age,
          band,
          source: 'auth',
          canSeeAlcohol: band !== 'teen' && (age == null || age >= 18),
        };
        return next();
      }
    } catch {
      /* token inválido: seguir como invitado */
    }
  }

  const declared =
    parseBand(req.headers['x-trago-band']) ||
    parseBand(req.query.band) ||
    parseBand(req.query.ageBand);

  if (declared) {
    req.viewer = {
      userId: null,
      age: declared === 'adult' ? 18 : 16,
      band: declared,
      source: 'declared',
      canSeeAlcohol: declared === 'adult',
    };
  }

  req.viewer.canSeeAlcohol = canSeeRestricted(req.viewer);
  next();
}
