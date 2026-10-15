import { z } from 'zod';
import {
  AGE_COOKIE,
  ageCookieOptions,
  ageSetCookieHeader,
  readAgeBandFromRequest,
  signAgeDeclaration,
} from '../lib/ageCookie.js';
import { bandFromAge, resolveUserAge } from '../lib/ageGate.js';
import { verifyAccessToken } from '../lib/jwt.js';
import Usuario from '../models/Usuario.js';

const declareSchema = z
  .object({
    adult: z.boolean(),
  })
  .strict();

/**
 * POST /api/age/declare { adult: true|false }
 * Cookie httpOnly firmada. Declaración, no verificación de identidad.
 */
export async function declareAge(req, res) {
  const parsed = declareSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Body inválido: { adult: boolean }',
    });
  }

  const band = parsed.data.adult ? 'adult' : 'teen';
  const token = signAgeDeclaration(band);
  res.cookie(AGE_COOKIE, token, ageCookieOptions());
  // Refuerzo para Netlify/serverless-http
  res.setHeader('Set-Cookie', ageSetCookieHeader(token));
  res.setHeader('Cache-Control', 'no-store');

  return res.json({
    ok: true,
    band,
    declaration: true,
    note: 'Declaración de edad; no es verificación de identidad. Alcohol solo 18+.',
  });
}

/** GET /api/age/status — banda efectiva (auth > cookie > anon). */
export async function ageStatus(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const user = await Usuario.findById(payload.id)
        .select('edad fecha_nacimiento estatus tokenVersion')
        .lean();
      if (
        user &&
        user.estatus === 'activo' &&
        Number(payload.tv ?? 0) === Number(user.tokenVersion ?? 0)
      ) {
        const age = resolveUserAge(user);
        const band = bandFromAge(age) || 'teen';
        return res.json({
          band,
          source: 'auth',
          canSeeRestricted: band === 'adult', // solo auth 18+
        });
      }
    } catch {
      /* fallthrough */
    }
  }

  const cookieBand = readAgeBandFromRequest(req);
  if (cookieBand) {
    return res.json({
      band: cookieBand,
      source: 'cookie',
      // Cookie no desbloquea alcohol: hace falta cuenta 18+.
      canSeeRestricted: false,
    });
  }

  return res.json({
    band: 'anon',
    source: 'anon',
    canSeeRestricted: false,
  });
}
