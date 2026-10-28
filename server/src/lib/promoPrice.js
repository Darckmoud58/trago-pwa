/**
 * Extrae precio legible de texto oficial (título / descripción).
 * No inventa: si no hay cifra clara, regresa null.
 */

function toMoney(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** "$48", "$48.00", "48.00", "48" */
function parseMoneyToken(raw) {
  const cleaned = String(raw || '')
    .replace(/,/g, '')
    .replace(/[^\d.]/g, '');
  const n = Number(cleaned);
  return toMoney(n);
}

/**
 * @param {string} text
 * @returns {{ precio: number|null, precioLista: number|null, precioTexto: string|null, multipack: number|null }}
 */
export function parsePromoPrice(text) {
  const raw = String(text || '');
  if (!raw.trim()) {
    return { precio: null, precioLista: null, precioTexto: null, multipack: null };
  }

  // 2x$48 / 3X $51.00 / 2 x $25 — exige $ para no confundir "2x1"
  const multi = raw.match(/(\d+)\s*[xX×]\s*\$\s*([\d]+(?:[.,]\d{1,2})?)/);
  if (multi) {
    const pack = Number(multi[1]);
    const precio = parseMoneyToken(multi[2]);
    if (pack >= 2 && precio != null) {
      return {
        precio,
        precioLista: null,
        precioTexto: `${pack}× $${precio % 1 === 0 ? precio.toFixed(0) : precio.toFixed(2)}`,
        multipack: pack,
      };
    }
  }

  // antes $60 / list $60 … ahora $48 (orden flexible)
  const antes = raw.match(
    /(?:antes|lista|regular|de)\s*\$?\s*([\d]+(?:[.,]\d{1,2})?)/i
  );
  const ahora = raw.match(
    /(?:ahora|por|a)\s*\$?\s*([\d]+(?:[.,]\d{1,2})?)/i
  );
  if (antes && ahora) {
    const lista = parseMoneyToken(antes[1]);
    const precio = parseMoneyToken(ahora[1]);
    if (precio != null && lista != null && lista > precio) {
      return {
        precio,
        precioLista: lista,
        precioTexto: `$${precio % 1 === 0 ? precio.toFixed(0) : precio.toFixed(2)}`,
        multipack: null,
      };
    }
  }

  // MÁS $5.00 (cargo extra) — no es precio de producto; omitir como precio principal
  if (/m[aá]s\s*\$/i.test(raw) && !/\$\s*\d/.test(raw.replace(/m[aá]s\s*\$[\d.,]+/i, ''))) {
    const extra = raw.match(/m[aá]s\s*\$?\s*([\d]+(?:[.,]\d{1,2})?)/i);
    const n = extra ? parseMoneyToken(extra[1]) : null;
    if (n != null) {
      return {
        precio: null,
        precioLista: null,
        precioTexto: `+ $${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`,
        multipack: null,
      };
    }
  }

  // Primer $NN suelto
  const single = raw.match(/\$\s*([\d]+(?:[.,]\d{1,2})?)/);
  if (single) {
    const precio = parseMoneyToken(single[1]);
    if (precio != null) {
      return {
        precio,
        precioLista: null,
        precioTexto: `$${precio % 1 === 0 ? precio.toFixed(0) : precio.toFixed(2)}`,
        multipack: null,
      };
    }
  }

  return { precio: null, precioLista: null, precioTexto: null, multipack: null };
}

/** Une precio numérico del scraper + texto. */
export function resolvePromoPrice({
  precio,
  precioLista,
  precioTexto,
  title,
  description,
} = {}) {
  const stored = toMoney(Number(precio));
  const storedList = toMoney(Number(precioLista));
  if (stored != null) {
    const texto =
      (precioTexto && String(precioTexto).trim()) ||
      `$${stored % 1 === 0 ? stored.toFixed(0) : stored.toFixed(2)}`;
    return {
      precio: stored,
      precioLista: storedList,
      precioTexto: texto,
    };
  }
  const parsed = parsePromoPrice([title, description, precioTexto].filter(Boolean).join(' — '));
  return {
    precio: parsed.precio,
    precioLista: parsed.precioLista,
    precioTexto: parsed.precioTexto,
  };
}
