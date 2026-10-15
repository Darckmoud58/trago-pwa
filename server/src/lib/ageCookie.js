import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';

export const AGE_COOKIE = 'age_ok';
const COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export function parseCookieHeader(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

/** Firma declaración adult|teen (no es verificación de identidad). */
export function signAgeDeclaration(band) {
  if (band !== 'adult' && band !== 'teen') {
    throw new Error('Banda inválida');
  }
  const { JWT_SECRET } = getEnv();
  return jwt.sign(
    { purpose: 'age_declare', band },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: `${COOKIE_MAX_AGE_SEC}s` }
  );
}

export function verifyAgeDeclaration(token) {
  if (!token) return null;
  try {
    const { JWT_SECRET } = getEnv();
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (payload?.purpose !== 'age_declare') return null;
    if (payload.band !== 'adult' && payload.band !== 'teen') return null;
    return payload.band;
  } catch {
    return null;
  }
}

export function ageCookieOptions() {
  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.NETLIFY === 'true' ||
    process.env.CONTEXT === 'production';
  // Netlify Function (mismo origen vía /api): Lax basta.
  // Cross-site (front y API en hosts distintos) necesita None+Secure.
  const crossSite = process.env.AGE_COOKIE_SAMESITE === 'none';
  return {
    httpOnly: true,
    secure: crossSite ? true : secure,
    sameSite: crossSite ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_SEC * 1000,
    path: '/',
  };
}

/** Header Set-Cookie explícito (serverless a veces pierde res.cookie). */
export function ageSetCookieHeader(token) {
  const opts = ageCookieOptions();
  const parts = [
    `${AGE_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${COOKIE_MAX_AGE_SEC}`,
    `SameSite=${opts.sameSite === 'none' ? 'None' : 'Lax'}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function readAgeBandFromRequest(req) {
  const cookies = parseCookieHeader(req.headers?.cookie);
  return verifyAgeDeclaration(cookies[AGE_COOKIE]);
}
