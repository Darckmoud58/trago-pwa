/**
 * Atajos de UI para contenido restringido.
 * M1: el servidor filtra; la UI no habla de umbrales.
 * Siempre ocultamos chips/atajos sensibles para no delatar el contenido.
 */
export function hasSession(): boolean {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
}

/** @deprecated M1 — no mostrar atajos de restringidas en UI. */
export function canSeeAlcoholUi(): boolean {
  return false;
}

export function hideRestrictedFilters(): boolean {
  return true;
}

export function loginState(from: string, reason?: string) {
  return { from: from || '/', reason };
}
