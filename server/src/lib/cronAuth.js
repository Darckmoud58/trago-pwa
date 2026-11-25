import { timingSafeEqual } from 'node:crypto';

/**
 * Comparación en tiempo constante de secretos (evita filtrar longitud vía timing).
 */
export function secretsEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Auth de cron: x-cron-secret o Authorization: Bearer <CRON_SECRET>.
 * Si CRON_SECRET no está definido, rechaza (evita cron abierto en prod).
 */
export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = String(
    req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'] || ''
  );
  if (headerSecret && secretsEqual(headerSecret, secret)) return true;

  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (secretsEqual(token, secret)) return true;
  }

  return false;
}
