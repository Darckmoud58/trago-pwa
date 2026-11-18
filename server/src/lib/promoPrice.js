/**
 * Precio de promo oficial — sin inventar.
 * Interpreta miles MX ($1,290.00), evita horas/porcentajes/códigos,
 * y distingue exacto / desde / cargo / anterior.
 */

/** @typedef {'exacto'|'desde'|'paquete'|'cargo'|'minimo'|'consultar'|null} PrecioModo */

/**
 * @typedef {object} ParsedPrice
 * @property {number|null} precio
 * @property {number|null} precioLista
 * @property {string|null} precioTexto
 * @property {number|null} multipack
 * @property {PrecioModo} modo
 * @property {boolean} ambiguous
 */

function toMoney(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function formatMoney(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

/**
 * Parsea token monetario MX/US.
 * "$1,290.00" → 1290; "$1.290,00" → 1290; "99" → 99.
 * No acepta horas ni enteros sueltos sin contexto de moneda.
 */
export function parseMoneyToken(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // El separador decimal es el que aparece al final.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // 1.290,00
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,290.00
      s = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      // miles: 1,290
      s = s.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length > 2) {
      // 1.290.00 raro → quitar puntos de miles
      const last = parts.pop();
      if (last.length <= 2) s = `${parts.join('')}.${last}`;
      else s = parts.join('') + last;
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      // Ambiguo 1.290 (¿miles?). En MX con $ suele ser miles sin decimales.
      s = parts.join('');
    }
  }

  const n = Number(s);
  return toMoney(n);
}

/** Captura cantidades con miles: 1,290.00 | 1.290,00 | 1290 | 99.50 */
const MONEY_NUM = String.raw`(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;

function stripNoiseForPrice(text) {
  return String(text || '')
    // Horas: 1 P.M. / 1:00 / 13:00 hrs
    .replace(
      /\b\d{1,2}\s*(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|hrs?|horas?)\b/gi,
      ' '
    )
    .replace(/\b(?:hasta|desde)\s+(?:la|las|el|los)?\s*\d{1,2}\b/gi, ' ')
    // Porcentajes
    .replace(/-?\d{1,3}\s*%/g, ' ')
    // Códigos raros al final del título (Vxb7fl)
    .replace(/\b[A-Za-z]{2,6}\d{2,6}[A-Za-z]{0,4}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHourContext(full, matchIndex) {
  const window = full.slice(Math.max(0, matchIndex - 12), matchIndex + 24);
  return /\b(?:a\.?\s*m\.?|p\.?\s*m\.?|hrs?|horas?|:)\b/i.test(window);
}

/**
 * @param {string} text
 * @returns {ParsedPrice}
 */
export function parsePromoPrice(text) {
  const empty = {
    precio: null,
    precioLista: null,
    precioTexto: null,
    multipack: null,
    modo: null,
    ambiguous: false,
  };
  const original = String(text || '');
  if (!original.trim()) return empty;

  const raw = stripNoiseForPrice(original);

  // 2x$48 / 3X $51.00
  const multi = raw.match(
    new RegExp(String.raw`(\d+)\s*[xX×]\s*\$\s*${MONEY_NUM}`)
  );
  if (multi) {
    const pack = Number(multi[1]);
    const precio = parseMoneyToken(multi[2]);
    if (pack >= 2 && precio != null) {
      return {
        precio,
        precioLista: null,
        precioTexto: `${pack}× ${formatMoney(precio)}`,
        multipack: pack,
        modo: 'paquete',
        ambiguous: false,
      };
    }
  }

  // Cargo adicional: + $5 / más $5 — no es precio total
  const cargo = raw.match(
    new RegExp(String.raw`(?:\+|m[aá]s)\s*\$\s*${MONEY_NUM}`, 'i')
  );
  const hasOtherMoney = new RegExp(String.raw`\$\s*${MONEY_NUM}`).test(
    raw.replace(cargo?.[0] || '', ' ')
  );
  if (cargo && !hasOtherMoney) {
    const n = parseMoneyToken(cargo[1]);
    if (n != null) {
      return {
        precio: null,
        precioLista: null,
        precioTexto: `+ ${formatMoney(n)}`,
        multipack: null,
        modo: 'cargo',
        ambiguous: false,
      };
    }
  }

  // Compra mínima
  const minimo = raw.match(
    new RegExp(
      String.raw`(?:compra\s+m[ií]nima|consumo\s+m[ií]nimo|m[ií]nimo(?:\s+de)?)\s*\$\s*${MONEY_NUM}`,
      'i'
    )
  );
  if (minimo && !/\$\s*\d/.test(raw.replace(minimo[0], ' '))) {
    const n = parseMoneyToken(minimo[1]);
    if (n != null) {
      return {
        precio: null,
        precioLista: null,
        precioTexto: `Mín. ${formatMoney(n)}`,
        multipack: null,
        modo: 'minimo',
        ambiguous: false,
      };
    }
  }

  // Desde $99 — calificativo obligatorio
  const desde = raw.match(
    new RegExp(String.raw`desde\s*\$\s*${MONEY_NUM}`, 'i')
  );
  if (desde) {
    const precio = parseMoneyToken(desde[1]);
    if (precio != null) {
      return {
        precio,
        precioLista: null,
        precioTexto: `Desde ${formatMoney(precio)}`,
        multipack: null,
        modo: 'desde',
        ambiguous: false,
      };
    }
  }

  // antes/lista/regular $X … ahora/por $Y
  // NO usar \bde\b ni "a" sueltos (rompen "desde" y "Hasta la 1").
  const antes = raw.match(
    new RegExp(
      String.raw`(?:antes|lista|regular|precio\s+normal|de\s+lista)\s*\$?\s*${MONEY_NUM}`,
      'i'
    )
  );
  const ahora = raw.match(
    new RegExp(
      String.raw`(?:ahora|por\s+solo|solo\s+por|precio\s+promo)\s*\$?\s*${MONEY_NUM}`,
      'i'
    )
  );
  if (antes && ahora) {
    const lista = parseMoneyToken(antes[1]);
    const precio = parseMoneyToken(ahora[1]);
    if (precio != null && lista != null && lista > precio) {
      return {
        precio,
        precioLista: lista,
        precioTexto: formatMoney(precio),
        multipack: null,
        modo: 'exacto',
        ambiguous: false,
      };
    }
  }

  // Recolectar todos los $ montos válidos (no horas)
  const moneyRe = new RegExp(String.raw`\$\s*${MONEY_NUM}`, 'g');
  /** @type {{ value: number, index: number, raw: string }[]} */
  const amounts = [];
  let m;
  while ((m = moneyRe.exec(raw)) !== null) {
    if (isHourContext(raw, m.index)) continue;
    const value = parseMoneyToken(m[1]);
    if (value == null) continue;
    // Descartar montos absurdamente chicos si el token era parte de hora residual
    amounts.push({ value, index: m.index, raw: m[0] });
  }

  if (amounts.length === 0) {
    return { ...empty, modo: 'consultar', precioTexto: null, ambiguous: true };
  }

  if (amounts.length === 1) {
    const precio = amounts[0].value;
    return {
      precio,
      precioLista: null,
      precioTexto: formatMoney(precio),
      multipack: null,
      modo: 'exacto',
      ambiguous: false,
    };
  }

  // Varios montos: si hay patrón claro mayor→menor (lista / oferta), úsalo.
  // No calcular % de ahorro inventado.
  const sorted = [...amounts].sort((a, b) => b.value - a.value);
  const high = sorted[0].value;
  const low = sorted[sorted.length - 1].value;
  if (high > low * 1.05 && amounts.length === 2) {
    // Evidencia débil de lista vs oferta solo si el texto habla de descuento/antes
    if (/(antes|lista|regular|descuento|ahorro|ahora|promo)/i.test(raw)) {
      return {
        precio: low,
        precioLista: high,
        precioTexto: formatMoney(low),
        multipack: null,
        modo: 'exacto',
        ambiguous: false,
      };
    }
  }

  // Ambiguo (p.ej. $379 y $227.40 sin evidencia de cuál es el de la oferta)
  return {
    precio: null,
    precioLista: null,
    precioTexto: null,
    multipack: null,
    modo: 'consultar',
    ambiguous: true,
  };
}

/**
 * Une precio estructurado del scraper + texto.
 * Campos estructurados confiables ganan; no recalcula descuentos.
 */
export function resolvePromoPrice({
  precio,
  precioLista,
  precioTexto,
  title,
  description,
} = {}) {
  const stored = toMoney(Number(precio));
  const storedList = toMoney(Number(precioLista));
  const direct = precioTexto && String(precioTexto).trim();
  const blob = [title, description, precioTexto].filter(Boolean).join(' — ');
  const fromText = parsePromoPrice(blob);

  // Corrección de lecturas previas corruptas (hora→$1, miles truncados).
  if (stored != null && fromText.precio != null) {
    if (
      stored <= 5 &&
      fromText.modo === 'desde' &&
      fromText.precio > stored
    ) {
      return fromText;
    }
    if (
      fromText.precio >= stored * 5 &&
      /\$\s*\d{1,3}[.,]\d{3}/.test(blob)
    ) {
      return fromText;
    }
  }

  if (stored != null) {
    const desdeTxt = direct && /^desde\b/i.test(direct);
    const texto =
      direct ||
      (desdeTxt ? `Desde ${formatMoney(stored)}` : formatMoney(stored));
    return {
      precio: stored,
      precioLista:
        storedList != null && storedList > stored ? storedList : null,
      precioTexto: texto,
      modo: desdeTxt ? 'desde' : 'exacto',
      ambiguous: false,
      multipack: null,
    };
  }

  // Si solo hay texto estructurado tipo "Desde $99" o "+ $5"
  if (direct) {
    const fromDirect = parsePromoPrice(direct);
    if (fromDirect.precioTexto || fromDirect.modo === 'consultar') {
      return fromDirect;
    }
  }

  const parsed = parsePromoPrice(
    [title, description, precioTexto].filter(Boolean).join(' — ')
  );
  if (parsed.ambiguous || parsed.modo === 'consultar') {
    return {
      precio: null,
      precioLista: null,
      precioTexto: null,
      multipack: null,
      modo: 'consultar',
      ambiguous: true,
    };
  }
  return parsed;
}

/** Etiqueta segura para UI. */
export function priceDisplayLabel(resolved) {
  if (!resolved) return null;
  if (resolved.modo === 'consultar' || resolved.ambiguous) {
    return 'Consultar precio';
  }
  if (resolved.precioTexto) return resolved.precioTexto;
  if (resolved.precio != null) return formatMoney(resolved.precio);
  return null;
}
