import Usuario from '../models/Usuario.js';
import {
  bandFromAge,
  canSeeRestricted,
  resolveUserAge,
} from '../lib/ageGate.js';
import { readAgeBandFromRequest } from '../lib/ageCookie.js';
import { verifyAccessToken } from '../lib/jwt.js';

/**
 * Auth opcional + banda de edad.
 * Prioridad: JWT (fecha_nacimiento en DB) > cookie firmada age_ok > anon.
 * Alcohol/nocturno: solo source=auth + 18+ (la cookie no desbloquea).
 * NO confía en X-Trago-Band ni ?band= (el cliente no puede saltarse el gate).
 */
export async function attachViewerAge(req, res, next) {
  req.viewer = {
    userId: null,
    age: null,
    band: 'anon',
    source: 'anon',
    canSeeAlcohol: false,
  };

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.id;
      req.role = payload.role;
      const user = await Usuario.findById(payload.id)
        .select('edad fecha_nacimiento estatus tokenVersion')
        .lean();
      const tvOk =
        user &&
        user.estatus === 'activo' &&
        Number(payload.tv ?? 0) === Number(user.tokenVersion ?? 0);
      if (tvOk) {
        const age = resolveUserAge(user);
        const band = bandFromAge(age) || 'teen';
        req.viewer = {
          userId: user._id,
          age,
          band,
          source: 'auth',
          canSeeAlcohol: false,
        };
        req.viewer.canSeeAlcohol = canSeeRestricted(req.viewer);
        setAgeResponseHeaders(res);
        return next();
      }
    } catch {
      /* token inválido: seguir como invitado */
    }
  }

  const cookieBand = readAgeBandFromRequest(req);
  if (cookieBand === 'adult' || cookieBand === 'teen') {
    req.viewer = {
      userId: null,
      age: cookieBand === 'adult' ? 18 : 16,
      band: cookieBand,
      source: 'cookie',
      canSeeAlcohol: false,
    };
  }

  req.viewer.canSeeAlcohol = canSeeRestricted(req.viewer);
  setAgeResponseHeaders(res);
  next();
}

export function setAgeResponseHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie, Authorization');
}
