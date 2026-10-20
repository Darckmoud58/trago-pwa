import { z } from 'zod';
import {
  AGE_COOKIE,
  ageCookieOptions,
  ageSetCookieHeaders,
  isBandLocked,
  readAgePayloadFromRequest,
  signAgeDeclaration,
} from '../lib/ageCookie.js';
import {
  MIN_ALCOHOL_AGE,
  bandFromAge,
  normalizeBand,
  resolveUserAge,
  yearsFromBirth,
} from '../lib/ageGate.js';
import { verifyAccessToken } from '../lib/jwt.js';
import Usuario from '../models/Usuario.js';

const birthDateSchema = z
  .object({
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate inválido'),
  })
  .strict();

/**
 * POST /api/edad { birthDate: YYYY-MM-DD }
 * Cookie httpOnly. Respuesta neutra { ok: true } — sin edad ni umbral.
 * No permite cambiar banda en 24 h.
 */
export async function declareBirthDate(req, res) {
  const parsed = birthDateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ message: 'No pudimos guardar tu fecha' });
  }

  const { birthDate } = parsed.data;
  const years = yearsFromBirth(`${birthDate}T12:00:00.000Z`);
  if (years == null || years < 0 || years > 120) {
    return res.status(400).json({ message: 'No pudimos guardar tu fecha' });
  }
  // Año ≥ 1900
  const year = Number(birthDate.slice(0, 4));
  if (!Number.isFinite(year) || year < 1900) {
    return res.status(400).json({ message: 'No pudimos guardar tu fecha' });
  }
  if (new Date(`${birthDate}T12:00:00.000Z`) > new Date()) {
    return res.status(400).json({ message: 'No pudimos guardar tu fecha' });
  }

  const existing = readAgePayloadFromRequest(req);
  if (existing && isBandLocked(existing)) {
    // No revela si la fecha habría cambiado la banda.
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true });
  }

  const band = years >= MIN_ALCOHOL_AGE ? 'adult' : 'minor';
  const token = signAgeDeclaration(band, Date.now());
  const opts = ageCookieOptions();
  res.cookie(AGE_COOKIE, token, opts);
  for (const h of ageSetCookieHeaders(token)) {
    res.append('Set-Cookie', h);
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ ok: true });
}

/**
 * Legacy POST /api/age/declare { adult } — redirige a cookie sin revelar umbral.
 * Preferir POST /api/edad.
 */
export async function declareAge(req, res) {
  const adult = Boolean(req.body?.adult);
  const existing = readAgePayloadFromRequest(req);
  if (existing && isBandLocked(existing)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true });
  }
  const band = adult ? 'adult' : 'minor';
  const token = signAgeDeclaration(band, Date.now());
  res.cookie(AGE_COOKIE, token, ageCookieOptions());
  for (const h of ageSetCookieHeaders(token)) {
    res.append('Set-Cookie', h);
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ ok: true });
}

/** GET /api/age/status — banda para saber si falta gate (sin hablar de alcohol). */
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
        const band = normalizeBand(bandFromAge(age) || 'minor');
        return res.json({
          band,
          source: 'auth',
          ok: true,
        });
      }
    } catch {
      /* fallthrough */
    }
  }

  const cookieBand = readAgePayloadFromRequest(req)?.band;
  if (cookieBand) {
    return res.json({
      band: normalizeBand(cookieBand),
      source: 'cookie',
      ok: true,
    });
  }

  return res.json({
    band: 'unknown',
    source: 'unknown',
    ok: true,
  });
}
