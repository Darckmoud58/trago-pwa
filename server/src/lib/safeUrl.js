/**
 * Solo permite http(s) absolutas. Rechaza javascript:, data:, etc.
 * @param {unknown} raw
 * @param {{ maxLen?: number }} [opts]
 * @returns {string}
 */
export function sanitizeHttpUrl(raw, opts = {}) {
  const maxLen = opts.maxLen ?? 2048;
  if (raw == null) return '';
  const s = String(raw).trim().slice(0, maxLen);
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

/**
 * Media de anuncios: http(s) o path mismo-origen `/…` (p.ej. /ads-beta/x.mp4).
 * @param {unknown} raw
 * @param {{ maxLen?: number }} [opts]
 * @returns {string}
 */
export function sanitizeMediaUrl(raw, opts = {}) {
  const maxLen = opts.maxLen ?? 2048;
  if (raw == null) return '';
  const s = String(raw).trim().slice(0, maxLen);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) {
    if (s.includes('://') || s.includes('\\') || s.includes('<')) return '';
    return s;
  }
  return sanitizeHttpUrl(s, opts);
}
