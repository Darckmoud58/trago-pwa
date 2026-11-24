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

/**
 * Quien pagó una posición concreta se queda con ella.
 * Aleatoria solo entra si esa posición nadie la reservó.
 * @param {Array<{ id_empresa?: unknown, titulo?: string, slot?: string, posicion?: string }>} rows
 * @param {string} position
 * @param {Record<string, { slug?: string, nombre?: string }>} empresaById
 */
export function selectPlacement(rows, position, empresaById = {}) {
  const reserved = [];
  const randoms = [];
  for (const row of rows || []) {
    const chosen = chosenPlacement(row);
    if (chosen === 'aleatoria') randoms.push(row);
    else if (chosen === position) reserved.push(row);
  }
  const reservedPaid = reserved.filter((row) => !rowIsDemo(row, empresaById));
  const randomPaid = randoms.filter((row) => !rowIsDemo(row, empresaById));
  const pool = reservedPaid.length
    ? reservedPaid
    : randomPaid.length
      ? randomPaid
      : rows || [];
  return selectSlotRotation(pool, empresaById);
}

function chosenPlacement(row) {
  const posicion = String(row?.posicion || '');
  if (posicion === 'aleatoria') return 'aleatoria';
  if (posicion) return posicion;
  const slot = String(row?.slot || '');
  if (!slot || slot === 'aleatoria') return 'aleatoria';
  return slot;
}

function rowIsDemo(row, empresaById) {
  const emp = empresaById[String(row?.id_empresa)] || {};
  return isDemoAd({
    titulo: row?.titulo,
    slug: emp.slug,
    nombre: emp.nombre,
  });
}
