/** Normaliza URLs de imagen (protocol-relative, &amp;, srcset). */
export function resolveMediaUrl(src?: string | null): string {
  if (!src) return '';
  let cleaned = String(src)
    .replace(/&amp;/gi, '&')
    .trim()
    .split(/\s+/)[0];
  if (cleaned.includes(',')) cleaned = cleaned.split(',')[0].trim().split(/\s+/)[0];
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  if (!/^https?:\/\//i.test(cleaned)) return '';
  return cleaned;
}
