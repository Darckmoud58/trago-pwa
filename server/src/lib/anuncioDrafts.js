/** Máximo de campañas en borrador por empresa (piloto). */
export const MAX_ANUNCIO_BORRADORES = 10;

export function draftLimitMessage(max = MAX_ANUNCIO_BORRADORES) {
  return `Máximo ${max} borradores por empresa. Publica o elimina uno para crear otro.`;
}

/**
 * @param {number} currentDraftCount
 * @param {number} [max]
 */
export function assertCanCreateDraft(currentDraftCount, max = MAX_ANUNCIO_BORRADORES) {
  const n = Number(currentDraftCount) || 0;
  if (n >= max) {
    const err = new Error(draftLimitMessage(max));
    err.status = 400;
    throw err;
  }
}
