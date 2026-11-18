import type { Promo } from '../types';

export function isPromoActive(p: Promo, now = Date.now()): boolean {
  const end = p.termina_en || p.endsAt;
  if (!end) return true;
  const t = new Date(end).getTime();
  if (Number.isNaN(t)) return true;
  return t >= now;
}

export function isOfficialPromo(p: Promo): boolean {
  const origin = p.origin || p.origen;
  return origin === 'oficial' || origin === 'official';
}

export function filterActivePromos(promos: Promo[]): Promo[] {
  return promos.filter((p) => isOfficialPromo(p) && isPromoActive(p));
}

/** Alcohol / adulto / candado 18+ — no debe quedar en caché tras logout. */
export function isRestrictedCachedPromo(p: Promo | null | undefined): boolean {
  if (!p) return false;
  if (p.requiresAuth) return true;
  if (p.alcohol) return true;
  if (p.audience === 'adult' || p.audiencia === 'adulto') return true;
  return false;
}

export function filterGuestSafePromos(promos: Promo[]): Promo[] {
  return filterActivePromos(promos).filter((p) => !isRestrictedCachedPromo(p));
}

export function canUseRestrictedOfflineCache(
  token: string | null | undefined,
  band: string | null | undefined
): boolean {
  return Boolean(token) && band === 'adult';
}
