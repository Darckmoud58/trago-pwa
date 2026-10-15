/** Detecta si la app corre instalada como PWA (standalone). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function hasAccount(): boolean {
  return Boolean(localStorage.getItem('token'));
}

/** Edad/políticas ya aceptadas en registro o con el sheet web. */
export const AGE_ACK_KEY = 'trago_age_ack';

export function markAgeAccepted() {
  localStorage.setItem(AGE_ACK_KEY, '1');
}

export function hasAgeAccepted(): boolean {
  return localStorage.getItem(AGE_ACK_KEY) === '1';
}

/**
 * Sheet 18+/políticas: en web anónimo sí; en PWA con cuenta no;
 * con sesión (web o PWA) tampoco (ya aceptó al crear cuenta).
 */
export function shouldShowAgeSheet(): boolean {
  if (hasAccount()) return false;
  if (isStandalonePwa() && hasAccount()) return false;
  return !hasAgeAccepted();
}

/**
 * ¿Ocultar chips 18+/Nocturno?
 * Sí si no hay cuenta, o si la cuenta es teen.
 * Solo cuenta adult los ve.
 */
export function hideAdultAgeFilters(): boolean {
  if (!hasAccount()) return true;
  return localStorage.getItem('trago_band') === 'teen';
}
