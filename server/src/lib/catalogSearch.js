/** Búsqueda de catálogo. Escapa el texto para que no sea un regex del cliente. */

export function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** null si el término es demasiado corto para consultar. */
export function promoSearchRegex(raw) {
  const term = String(raw || '').trim().slice(0, 80);
  if (term.length < 2) return null;
  return new RegExp(escapeRegex(term), 'i');
}

/**
 * @param {RegExp} rx
 * @param {import('mongoose').Types.ObjectId[]} [empresaIds]
 */
export function buildPromoSearchClause(rx, empresaIds = []) {
  const or = [{ nombre: rx }, { descripcion: rx }];
  if (empresaIds.length) or.push({ id_empresa: { $in: empresaIds } });
  return { $or: or };
}
