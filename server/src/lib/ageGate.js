/** Edad mínima de cuenta y de contenido con alcohol / nocturno. */
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

export function bandFromAge(age) {
  if (age == null || !Number.isFinite(age)) return null;
  return age >= MIN_ALCOHOL_AGE ? 'adult' : 'teen';
}

export function parseBand(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (v === 'adult' || v === 'adulto' || v === '18+') return 'adult';
  if (v === 'teen' || v === 'menor' || v === '13-17') return 'teen';
  return null;
}

/** Promos con alcohol, audiencia adulto o nocturno → solo 18+. */
export function isRestrictedPromo(promo) {
  if (!promo) return false;
  return Boolean(
    promo.alcohol ||
      promo.audiencia === 'adulto' ||
      promo.audience === 'adult' ||
      promo.nocturno ||
      promo.isNocturno
  );
}

export function canSeeRestricted(viewer) {
  if (!viewer) return true;
  if (viewer.canSeeAlcohol === false) return false;
  if (viewer.band === 'teen') return false;
  if (viewer.age != null && Number.isFinite(viewer.age)) {
    return viewer.age >= MIN_ALCOHOL_AGE;
  }
  return viewer.band !== 'teen';
}

export function filterPromosForViewer(promos, viewer) {
  if (canSeeRestricted(viewer)) return promos;
  return promos.filter((p) => !isRestrictedPromo(p));
}

/** Cláusula Mongo para excluir alcohol/nocturno del catálogo. */
export function mongoExcludeRestricted() {
  return {
    alcohol: { $ne: true },
    audiencia: { $ne: 'adulto' },
    nocturno: { $ne: true },
  };
}
