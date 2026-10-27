/** Edad mínima de cuenta y de contenido restringido (servidor; no se expone en UI). */
export const MIN_ACCOUNT_AGE = 13;
export const MIN_ALCOHOL_AGE = 18;

export function yearsFromBirth(birthDate, now = new Date()) {
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let y = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) y -= 1;
  return y;
}

/** Recalcula edad a partir de fecha_nacimiento si existe; si no, usa edad guardada. */
export function resolveUserAge(user, now = new Date()) {
  if (!user) return null;
  if (user.fecha_nacimiento) {
    const y = yearsFromBirth(user.fecha_nacimiento, now);
    if (y != null && Number.isFinite(y)) return y;
  }
  const ed = Number(user.edad);
  return Number.isFinite(ed) ? ed : null;
}

/** Banda pública del viewer: adult | minor | unknown */
export function bandFromAge(age) {
  if (age == null || !Number.isFinite(age)) return null;
  return age >= MIN_ALCOHOL_AGE ? 'adult' : 'minor';
}

export function parseBand(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (v === 'adult' || v === 'adulto') return 'adult';
  if (v === 'minor' || v === 'teen' || v === 'menor') return 'minor';
  if (v === 'unknown' || v === 'anon') return 'unknown';
  return null;
}

/** Normaliza bandas legacy (teen/anon) → M1. */
export function normalizeBand(band) {
  if (band === 'teen') return 'minor';
  if (band === 'anon' || !band) return 'unknown';
  if (band === 'adult' || band === 'minor') return band;
  return 'unknown';
}

/** Promo restringida: alcohol, audiencia adulto, nocturno, o el texto es una bebida. */
const ALCOHOL_TEXT =
  /cerveza|vino|licor|mezcal|tequila|whisk(?:e)?y|alcohol|chela|buchanan|johnnie|\bron\b|pac[ií]fico|michelob|tecate|heineken|budweiser|bud\s*light|stella|carta\s+blanca|bohemia|dos\s+equis|caguama|vodka|ginebra|\bgin\b|brandy|co[nñ]ac|champagne|\bsidra\b|pulque|bacardi|smirnoff|cuervo|don\s+julio|herradura|jack\s+daniel|six\s*pack|6\s*pack/;

const NON_ALCOHOL = /sin\s+alcohol|alcohol\s*free|0\.0\s*%|0,0\s*%/;

function fold(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function looksLikeAlcohol(text) {
  const folded = fold(text).replace(NON_ALCOHOL, ' ');
  return ALCOHOL_TEXT.test(folded);
}

function promoCopy(promo) {
  return [promo.nombre, promo.title, promo.descripcion, promo.subtitle, promo.description]
    .filter(Boolean)
    .join(' ');
}

export function isRestrictedPromo(promo) {
  if (!promo) return false;
  const copy = promoCopy(promo);
  if (looksLikeAlcohol(copy)) return true;
  if (NON_ALCOHOL.test(fold(copy))) return false;
  return Boolean(
    promo.alcohol ||
      promo.audiencia === 'adulto' ||
      promo.audience === 'adult' ||
      promo.nocturno ||
      promo.isNocturno
  );
}

/**
 * Alcohol solo con cuenta de 18+.
 * Sin sesión, o con solo la cookie de edad, no se muestra.
 * Una cuenta menor nunca ve, aunque la cookie diga adult.
 */
export function canSeeRestricted(viewer) {
  if (!viewer || viewer.source !== 'auth' || !viewer.userId) return false;
  const band = normalizeBand(viewer.band);
  if (band !== 'adult') return false;
  if (viewer.age != null && Number.isFinite(viewer.age)) {
    return viewer.age >= MIN_ALCOHOL_AGE;
  }
  return true;
}

/** Alias M1. */
export function canView(promo, viewer) {
  if (!isRestrictedPromo(promo)) return true;
  return canSeeRestricted(viewer);
}

export function filterPromosForViewer(promos, viewer) {
  if (canSeeRestricted(viewer)) return promos;
  return promos.filter((p) => !isRestrictedPromo(p));
}

/** Cláusula Mongo para excluir restringidas del catálogo. */
export function mongoExcludeRestricted() {
  return {
    alcohol: { $ne: true },
    audiencia: { $ne: 'adulto' },
    nocturno: { $ne: true },
  };
}
