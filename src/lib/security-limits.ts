/** Límites y helpers sin APIs de Node (seguro en cliente). */

import { trustedOrigins } from "./google-oauth";

/** Tope diario de puntos ganados (no cuenta canjes negativos). */
export const MAX_POINTS_PER_DAY = 40;

/** Fallos de login antes de bloquear. */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MINUTES = 15;

/** Registros por IP / hora. */
export const REGISTER_MAX_PER_HOUR = 5;

/** Opiniones nuevas por usuario / hora (aunque fallen). */
export const REVIEW_MAX_PER_HOUR = 3;

export class SecurityError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "SecurityError";
    this.status = status;
  }
}

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** Bloquea POSTs cross-site. Acepta APP_ORIGIN + URL de Netlify + host del request. */
export function assertSameOrigin(request: Request): void {
  const allowed = trustedOrigins(request);
  if (allowed.length === 0) return;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (origin) {
    const o = origin.replace(/\/$/, "");
    if (!allowed.includes(o)) {
      throw new SecurityError(403, "Origen no permitido.");
    }
    return;
  }
  if (referer) {
    const ok = allowed.some((a) => referer.startsWith(a));
    if (!ok) throw new SecurityError(403, "Referer no permitido.");
  }
}

export function sanitizeText(raw: string, max = 500): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);
}

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

/** Rate limit en memoria del proceso (complementa locks en Mongo). */
export function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
  }
  cur.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
