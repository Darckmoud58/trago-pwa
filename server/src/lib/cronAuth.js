/**
 * Auth de cron: x-cron-secret o Authorization: Bearer <CRON_SECRET>.
 * Si CRON_SECRET no está definido, rechaza (evita cron abierto en prod).
 */
export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret =
    req.headers['x-cron-secret'] || req.headers['X-Cron-Secret'] || '';
  if (headerSecret && headerSecret === secret) return true;

  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ') && auth.slice(7) === secret) return true;

  return false;
}
