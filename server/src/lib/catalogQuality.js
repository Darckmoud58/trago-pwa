/**
 * Clasificación de entradas de catálogo oficial.
 * No publica como oferta solo por venir de dominio oficial.
 */

/** @typedef {'oferta'|'lealtad'|'campana'|'producto'|'revision'} CatalogKind */

function fold(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LANDING_TITLES =
  /^(promociones|ofertas|promos)(\s+(oficiales|oxxo|7\s*-?\s*eleven|heb|circle\s*k|la\s+europea|vips))?$/i;

const CAMPAIGN =
  /conoce\s+todas|suscr[ií]bete|newsletter|reg[ií]strate\s+al\s+club|s[ií]guenos|descarga\s+la\s+app|visita\s+nuestro\s+sitio|todas\s+nuestras\s+promociones|campa[nñ]a\s+destacada/i;

const LOYALTY =
  /cumplea[nñ]os|birthday|lealtad|puntos\s+dobles|miembro|club\s+de\s+socios|freebie|regalo\s+de\s+cumple/i;

const BENEFIT =
  /\d+\s*[xX×]\s*\d+|\b2x1\b|\b3x2\b|descuento|%\s*off|desde\s*\$|\$\s*\d|ahorro|bonific|\bgratis\b|\bregalo\b|\bcombo\b|\boferta\b|\bflash\b|\bmsi\b/i;

/** Título con cola tipo hash de CMS: "HappyStarBurger Vxb7fl" / "… Ijlavz" */
export function looksLikeInternalResourceName(title) {
  const t = String(title || '').trim();
  if (!t) return true;
  const parts = t.split(/\s+/);
  const last = parts[parts.length - 1] || '';
  if (parts.length < 2) return false;
  if (/^(2x1|3x2|promo|oferta|combo)$/i.test(last)) return false;
  // Sufijo letras+dígitos (Vxb7fl)
  if (
    last.length >= 4 &&
    last.length <= 10 &&
    /^[A-Za-z]+\d+[A-Za-z0-9]*$/.test(last)
  ) {
    return true;
  }
  // Sufijo hash solo letras (Ijlavz) tras título CamelCase compuesto
  const headJoined = parts.slice(0, -1).join('').replace(/[^A-Za-z]/g, '');
  const headIsCamel = /[a-z][A-Z]/.test(headJoined);
  if (
    headIsCamel &&
    last.length >= 5 &&
    last.length <= 8 &&
    /^[A-Za-z]+$/.test(last) &&
    /[A-Z]/.test(last) &&
    /[a-z]/.test(last)
  ) {
    return true;
  }
  if (/\.(png|jpe?g|webp|gif|svg|pdf)$/i.test(t)) return true;
  return false;
}

const MARKDOWN_LINK = /\]\(\s*https?:/i;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\(/;
const BARE_TITLE_PREFIX = /^title\s*:/i;

/**
 * Título que no es una oferta: markdown de navegación, "Title: …" o landing.
 * No marca como ilegible un producto del grid oficial solo porque no trae 2x1.
 */
export function isUnreadableCatalogTitle(title) {
  const t = String(title || '').trim();
  if (!t || t.length < 3) return true;
  if (MARKDOWN_LINK.test(t) || MARKDOWN_IMAGE.test(t)) return true;
  if (BARE_TITLE_PREFIX.test(t)) return true;
  if (isLandingPromoTitle(t)) return true;
  if (looksLikeInternalResourceName(t)) return true;
  return false;
}

export function isLandingPromoTitle(title) {
  const t = fold(title).replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return true;
  if (LANDING_TITLES.test(t)) return true;
  if (/^promociones[a-z]{2,}$/.test(t.replace(/\s/g, ''))) return true;
  return false;
}

/**
 * @param {{
 *   title?: string,
 *   description?: string,
 *   price?: number|null,
 *   priceText?: string|null,
 *   birthday?: boolean,
 *   fromOfficialPromoGrid?: boolean,
 * }} hit
 * @returns {{ kind: CatalogKind, publish: boolean, reason: string }}
 */
export function classifyCatalogEntry(hit = {}) {
  const title = String(hit.title || '').trim();
  const description = String(hit.description || '').trim();
  const blob = `${title} ${description}`;

  if (!title || title.length < 3 || isUnreadableCatalogTitle(title)) {
    return { kind: 'revision', publish: false, reason: 'titulo-ilegible' };
  }
  if (isLandingPromoTitle(title)) {
    return { kind: 'campana', publish: false, reason: 'landing' };
  }
  if (looksLikeInternalResourceName(title)) {
    return { kind: 'revision', publish: false, reason: 'nombre-interno' };
  }
  if (CAMPAIGN.test(blob) && !BENEFIT.test(blob)) {
    return { kind: 'campana', publish: false, reason: 'campana-informativa' };
  }
  if (hit.birthday || LOYALTY.test(blob)) {
    const hasBenefit = BENEFIT.test(blob) || hit.price != null;
    return {
      kind: 'lealtad',
      publish: hasBenefit,
      reason: hasBenefit ? 'lealtad-con-beneficio' : 'lealtad-sin-beneficio',
    };
  }
  if (BENEFIT.test(blob) || hit.price != null || hit.priceText) {
    return { kind: 'oferta', publish: true, reason: 'beneficio-detectado' };
  }
  // Producto a precio regular sin beneficio claro
  if (/\$\s*\d/.test(blob) && !/(promo|oferta|descuento|2x1|desde)/i.test(blob)) {
    return { kind: 'producto', publish: false, reason: 'precio-regular' };
  }
  // Grid oficial (p. ej. open_promo_image de OXXO): el listado YA es la promo;
  // el sitio a menudo no pone 2x1/$ en el título de la card.
  if (hit.fromOfficialPromoGrid && title.length >= 4 && !/^name$/i.test(title)) {
    return { kind: 'oferta', publish: true, reason: 'listado-oficial' };
  }
  return { kind: 'revision', publish: false, reason: 'sin-beneficio-claro' };
}

/** Limpia sufijos internos del título sin inventar nombre comercial. */
export function sanitizePromoTitle(title) {
  let t = String(title || '').trim();
  if (!t) return '';
  if (looksLikeInternalResourceName(t)) {
    const parts = t.split(/\s+/);
    parts.pop();
    t = parts.join(' ').trim();
  }
  t = t.replace(/\.(png|jpe?g|webp|gif|svg|pdf)$/i, '').trim();
  return t.slice(0, 160);
}
