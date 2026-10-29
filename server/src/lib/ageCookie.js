import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { normalizeBand } from './ageGate.js';

/** Cookie M1 (httpOnly). Se acepta también el nombre legacy `age_ok`. */
export const AGE_COOKIE = 'edad_band';
export const AGE_COOKIE_LEGACY = 'age_ok';
const COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;
export const BAND_LOCK_MS = 24 * 60 * 60 * 1000;

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

/**
 * Firma declaración adult|minor.
 * @param {'adult'|'minor'} band
 * @param {number} [declaredAt]
 */
export function signAgeDeclaration(band, declaredAt = Date.now()) {
  const b = normalizeBand(band);
  if (b !== 'adult' && b !== 'minor') {
    throw new Error('Banda inválida');
  }
  const { JWT_SECRET } = getEnv();
  return jwt.sign(
    { purpose: 'age_declare', band: b, declaredAt },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: `${COOKIE_MAX_AGE_SEC}s` }
  );
}

/** @returns {{ band: 'adult'|'minor', declaredAt: number } | null} */
export function verifyAgeDeclarationPayload(token) {
  if (!token) return null;
  try {
    const { JWT_SECRET } = getEnv();
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (payload?.purpose !== 'age_declare') return null;
    const band = normalizeBand(payload.band === 'teen' ? 'minor' : payload.band);
    if (band !== 'adult' && band !== 'minor') return null;
    const declaredAt = Number(payload.declaredAt) || 0;
    return { band, declaredAt };
  } catch {
    return null;
  }
}

export function verifyAgeDeclaration(token) {
  return verifyAgeDeclarationPayload(token)?.band || null;
}

export function ageCookieOptions() {
  const onVercel = Boolean(
    process.env.VERCEL && process.env.VERCEL !== '0' && process.env.VERCEL !== 'false'
  );
  const secure =
    process.env.NODE_ENV === 'production' ||
    process.env.NETLIFY === 'true' ||
    onVercel ||
    process.env.CONTEXT === 'production';
  // Front y API en dominios distintos (2 proyectos Vercel): SameSite=None.
  const crossSite = process.env.AGE_COOKIE_SAMESITE === 'none';
  return {
    httpOnly: true,
    secure: crossSite ? true : secure,
    sameSite: crossSite ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_SEC * 1000,
    path: '/',
  };
}

function cookieHeaderParts(name, token) {
  const opts = ageCookieOptions();
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${COOKIE_MAX_AGE_SEC}`,
    `SameSite=${opts.sameSite === 'none' ? 'None' : 'Lax'}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

/** Set-Cookie de banda + limpia legacy age_ok. */
export function ageSetCookieHeaders(token) {
  const clearLegacy = `${AGE_COOKIE_LEGACY}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  return [cookieHeaderParts(AGE_COOKIE, token), clearLegacy];
}

/** @deprecated usar ageSetCookieHeaders */
export function ageSetCookieHeader(token) {
  return cookieHeaderParts(AGE_COOKIE, token);
}

export function readAgePayloadFromRequest(req) {
  const cookies = parseCookieHeader(req.headers?.cookie);
  return (
    verifyAgeDeclarationPayload(cookies[AGE_COOKIE]) ||
    verifyAgeDeclarationPayload(cookies[AGE_COOKIE_LEGACY])
  );
}

export function readAgeBandFromRequest(req) {
  return readAgePayloadFromRequest(req)?.band || null;
}

export function isBandLocked(payload, now = Date.now()) {
  if (!payload?.declaredAt) return false;
  return now - Number(payload.declaredAt) < BAND_LOCK_MS;
}
