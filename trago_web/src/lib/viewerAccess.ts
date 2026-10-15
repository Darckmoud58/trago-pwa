import { getAgeBand } from './ageBand';

/** Hay JWT de cuenta real en el dispositivo. */
export function hasSession(): boolean {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
}

/**
 * Alcohol / nocturno en UI: solo sesión + banda adult (fecha de cuenta).
 * Cookie de declaración no basta.
 */
export function canSeeAlcoholUi(): boolean {
  if (!hasSession()) return false;
  return getAgeBand() === 'adult';
}

/** Invitado / teen / cookie-only: ocultar atajos y filtros 18+. */
export function hideRestrictedFilters(): boolean {
  return !canSeeAlcoholUi();
}

/** Destino de login con retorno (react-router state lo usa Login/Register). */
export function loginState(from: string, reason?: string) {
  return { from: from || '/', reason };
}
