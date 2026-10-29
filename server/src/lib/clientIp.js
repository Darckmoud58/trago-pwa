/**
 * IP del cliente para rate limit.
 * Prioridad: cabecera Netlify (no spoofeable desde el browser) → req.ip
 * (solo fiable con trust proxy) → socket remoto.
 * No leer X-Forwarded-For en crudo: un cliente directo puede spoofearlo
 * y vaciar el rate limit.
 */
export function clientIp(req) {
  const nf = req.headers['x-nf-client-connection-ip'];
  if (nf) return String(nf).trim() || 'unknown';

  const onVercel = Boolean(
    process.env.VERCEL && process.env.VERCEL !== '0' && process.env.VERCEL !== 'false'
  );
  const behindProxy =
    process.env.NETLIFY === 'true' ||
    onVercel ||
    process.env.TRUST_PROXY === '1' ||
    process.env.TRUST_PROXY === 'true';

  if (behindProxy && req.ip) {
    return String(req.ip).replace(/^::ffff:/, '');
  }

  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (remote) return String(remote).replace(/^::ffff:/, '');
  if (req.ip) return String(req.ip).replace(/^::ffff:/, '');
  return 'unknown';
}
