/** IP del cliente (Netlify → x-nf-client-connection-ip). */
export function clientIp(req) {
  const nf = req.headers['x-nf-client-connection-ip'];
  if (nf) return String(nf).trim();
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim() || 'unknown';
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  return req.ip || 'unknown';
}
