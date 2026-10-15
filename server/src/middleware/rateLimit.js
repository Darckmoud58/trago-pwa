import RateLimit from '../models/RateLimit.js';
import { clientIp } from '../lib/clientIp.js';

/**
 * Rate limit respaldado en Mongo (sirve en Netlify Functions).
 * @returns {{ ok: boolean, retryAfterSec?: number, remaining?: number }}
 */
export async function consumeRateLimit(key, max, windowMs, now = new Date()) {
  const expiresAt = new Date(now.getTime() + windowMs);
  let doc = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (!doc) {
    try {
      doc = await RateLimit.findOneAndUpdate(
        { key },
        { $set: { count: 1, expiresAt }, $setOnInsert: { key } },
        { upsert: true, new: true }
      );
    } catch {
      doc = await RateLimit.findOneAndUpdate(
        { key, expiresAt: { $gt: now } },
        { $inc: { count: 1 } },
        { new: true }
      );
    }
  }

  if (!doc) return { ok: true, remaining: max - 1 };

  if (doc.count > max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((new Date(doc.expiresAt).getTime() - now.getTime()) / 1000)
    );
    return { ok: false, retryAfterSec };
  }
  return { ok: true, remaining: Math.max(0, max - doc.count) };
}

/**
 * Middleware Express.
 * options: { name, max, windowMs, keyFn?(req)=>string }
 */
export function rateLimit({ name, max, windowMs, keyFn } = {}) {
  return async (req, res, next) => {
    try {
      const ip = clientIp(req);
      const key = keyFn ? keyFn(req, ip) : `rl:${name}:${ip}`;
      const result = await consumeRateLimit(key, max, windowMs);
      if (!result.ok) {
        res.setHeader('Retry-After', String(result.retryAfterSec));
        return res.status(429).json({
          message: 'Demasiadas peticiones. Intenta más tarde.',
          retryAfterSec: result.retryAfterSec,
        });
      }
      next();
    } catch (e) {
      console.error('rateLimit:', e.message);
      next();
    }
  };
}

export const LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 },
  register: { max: 5, windowMs: 60 * 60 * 1000 },
  cerca: { max: 20, windowMs: 60 * 1000 },
  api: { max: 120, windowMs: 60 * 1000 },
  vote: { max: 12, windowMs: 60 * 60 * 1000 },
  /** Beacon métricas: anti-flood R-03 (por IP). */
  metrics: { max: 30, windowMs: 60 * 1000 },
};
