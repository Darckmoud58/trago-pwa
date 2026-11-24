/** Normaliza URLs de imagen/video (protocol-relative, &amp;, srcset, paths locales). */
export function resolveMediaUrl(src?: string | null): string {
  if (!src) return '';
  let cleaned = String(src)
    .replace(/&amp;/gi, '&')
    .trim()
    .split(/\s+/)[0];
  if (cleaned.includes(',')) cleaned = cleaned.split(',')[0].trim().split(/\s+/)[0];
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  // Assets del front (public/ads-beta/…): mismo origen
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    if (cleaned.includes('://') || cleaned.includes('\\')) return '';
    if (cleaned.startsWith('/api/')) {
      const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      return `${base}${cleaned}`;
    }
    return cleaned;
  }
  if (!/^https?:\/\//i.test(cleaned)) return '';
  return cleaned;
}
