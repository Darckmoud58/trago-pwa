/**
 * Un anuncio pagado ocupa un solo slot.
 * Si varias cadenas pagaron ese mismo slot, rotan (una por empresa).
 * El creativo demo solo llena el slot cuando nadie ha pagado ese espacio.
 */

export function isDemoAd({ titulo = '', slug = '', nombre = '' } = {}) {
  if (String(slug) === 'trago-beta-ads') return true;
  if (/^beta\s*·/i.test(String(titulo))) return true;
  if (/trago\s*beta/i.test(String(nombre))) return true;
  return false;
}

/**
 * @param {Array<{ id_empresa?: unknown, titulo?: string }>} rows
 *   ya filtrados por slot y ordenados del más reciente al más viejo
 * @param {Record<string, { slug?: string, nombre?: string }>} empresaById
 */
export function selectSlotRotation(rows, empresaById = {}) {
  const tagged = (rows || []).map((row) => {
    const emp = empresaById[String(row.id_empresa)] || {};
    return {
      row,
      empresaId: String(row.id_empresa || ''),
      demo: isDemoAd({
        titulo: row.titulo,
        slug: emp.slug,
        nombre: emp.nombre,
      }),
    };
  });
  const paid = tagged.filter((item) => !item.demo);
  const pool = paid.length ? paid : tagged;
  const seen = new Set();
  const out = [];
  for (const item of pool) {
    if (!item.empresaId || seen.has(item.empresaId)) continue;
    seen.add(item.empresaId);
    out.push(item.row);
  }
  return out;
}
