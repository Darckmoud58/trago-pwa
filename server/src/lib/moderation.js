import { VOTES_PER_HOUR, VOTE_WINDOW_DAYS } from './validity.js';

/** Máximo de reportes nuevos por usuario al día. */
export const VOTES_PER_DAY = Number(process.env.TRAGO_VOTES_PER_DAY || 30);

/** Cambios de voto (flip-flop) en 24 h sobre el mismo vínculo. */
export const FLIPFLOP_MAX_PER_DAY = Number(process.env.TRAGO_FLIPFLOP_MAX || 3);

/** Rate limit en memoria para ráfagas (además de Mongo). */
const buckets = new Map();

/**
 * Rate limit simple por clave.
 * @returns {{ ok: boolean, retryAfterSec?: number, remaining?: number }}
 */
export function hitRateLimit(key, max, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    const retryAfterSec = Math.ceil((bucket.start + windowMs - now) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { ok: true, remaining: max - bucket.count };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}

/**
 * Evalúa si el usuario puede votar (bloqueo temporal / cuenta).
 */
export function voteBanStatus(user, now = new Date()) {
  if (!user) return { banned: true, reason: 'Usuario no válido' };
  if (user.estatus === 'bloqueado') {
    return { banned: true, reason: 'Tu cuenta está bloqueada para reportes.' };
  }
  if (user.reportes_bloqueado_hasta) {
    const until = new Date(user.reportes_bloqueado_hasta);
    if (until > now) {
      return {
        banned: true,
        reason: `Reportes pausados hasta ${until.toISOString()}. Evita abuso de votos.`,
        until,
      };
    }
  }
  return { banned: false };
}

/**
 * Detecta flip-flop: historial de cambios recientes en el mismo vínculo.
 * `prev` es el voto actual; si stillValid !== prev.sigue_vigente cuenta como cambio.
 */
export function isFlipFlopAbuse(prev, stillValid, flipEventsLast24h) {
  if (!prev) return false;
  if (prev.sigue_vigente === stillValid) return false;
  return flipEventsLast24h >= FLIPFLOP_MAX_PER_DAY;
}

export const MODERATION_COPY = {
  windowDays: VOTE_WINDOW_DAYS,
  votesPerHour: VOTES_PER_HOUR,
  votesPerDay: VOTES_PER_DAY,
  flipFlopMax: FLIPFLOP_MAX_PER_DAY,
};
