import { getAgeBand } from './ageBand';

/**
 * Alcohol / nocturno en UI: solo sesión + banda adult (fecha de cuenta).
 * Cookie de declaración no basta.
 */
export function canSeeAlcoholUi(): boolean {
  try {
    if (!localStorage.getItem('token')) return false;
    return getAgeBand() === 'adult';
  } catch {
    return false;
  }
}

/** Invited / teen / cookie-only: ocultar atajos y filtros 18+. */
export function hideRestrictedFilters(): boolean {
  return !canSeeAlcoholUi();
}
