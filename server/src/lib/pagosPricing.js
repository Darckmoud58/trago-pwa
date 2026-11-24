/**
 * Lista piloto GDL (docs/PROPUESTA-FREEMIUM-EQUIPO.md / PLAN-ANUNCIOS).
 * Base por plan + extra por sucursal a partir de la 2ª.
 */

export const PLAN_BASE_MXN = {
  basic: 2900,
  campaign: 4900,
  pro: 4900,
  premium: 6900,
};

/** Extra MXN/mes por sucursal adicional (después de la incluida). */
export const EXTRA_SUCURSAL_MXN = 500;

/** Cada ventana adicional, mismo precio base. No vuelve a cobrar las sucursales. */
export const EXTRA_SLOT_MXN = PLAN_BASE_MXN.basic;

/** Elegir una posición concreta dentro de la ventana. Aleatoria no se cobra. */
export const POSITION_EXTRA_MXN = 50;

export const AD_SLOTS = [
  'home_rail',
  'explorar_mid',
  'cerca_top',
  'side_left',
  'side_right',
];

/** Ventanas que se compran. Las posiciones viven dentro de cada una. */
export const AD_WINDOWS = {
  inicio: ['home_rail', 'inicio_side_left', 'inicio_side_right'],
  explorar: ['explorar_mid', 'explorar_side_left', 'explorar_side_right'],
};

const LEGACY_SIDE = {
  inicio_side_left: 'side_left',
  explorar_side_left: 'side_left',
  inicio_side_right: 'side_right',
  explorar_side_right: 'side_right',
};

export const INCLUDED_BRANCHES = 1;

export const DEFAULT_DAYS = 30;

/**
 * @param {string} plan
 * @param {number} [sucursales=1]
 */
export function quoteSubscription(plan, sucursales = 1) {
  const p = PLAN_BASE_MXN[plan] != null ? plan : 'basic';
  const n = Math.max(1, Math.min(Math.floor(Number(sucursales) || 1), 200));
  const base = PLAN_BASE_MXN[p];
  const extra = Math.max(0, n - INCLUDED_BRANCHES) * EXTRA_SUCURSAL_MXN;
  return {
    plan: p,
    sucursales: n,
    base,
    extra,
    monto: base + extra,
    moneda: 'MXN',
    dias: DEFAULT_DAYS,
    includedBranches: INCLUDED_BRANCHES,
    extraPerBranch: EXTRA_SUCURSAL_MXN,
  };
}

/**
 * Un pago vigente sin campos guardados ya cubrió Home.
 * @param {{ slots?: string[], activo?: boolean, estatus?: string } | null} sub
 */
export function slotsFromLegacy(sub) {
  const raw = Array.isArray(sub?.slots) ? sub.slots : [];
  const listed = raw.filter(
    (slot) => AD_SLOTS.includes(slot) || slot === 'inicio' || slot === 'explorar'
  );
  if (listed.length) return [...new Set(listed)];
  if (sub && sub.activo && sub.estatus === 'activo') return ['home_rail'];
  return [];
}

export function normalizeWindow(slot) {
  if (slot === 'inicio' || slot === 'home_rail') return 'inicio';
  if (slot === 'explorar' || slot === 'explorar_mid') return 'explorar';
  return '';
}

export function isPositionId(id) {
  if (AD_SLOTS.includes(id)) return true;
  return Object.values(AD_WINDOWS).some((list) => list.includes(id));
}

export function windowForPosition(position) {
  for (const [ventana, list] of Object.entries(AD_WINDOWS)) {
    if (list.includes(position)) return ventana;
  }
  return '';
}

export function legacySlotsFor(position) {
  const legacy = LEGACY_SIDE[position];
  return legacy ? [legacy] : [];
}

function activeSub(sub) {
  return Boolean(sub && sub.activo && sub.estatus === 'activo');
}

/** Inicio y Explorar ya pagados. Un plan viejo sin campos guardados cuenta como Inicio. */
export function ownedWindows(sub) {
  if (!activeSub(sub)) return [];
  const slots = Array.isArray(sub.slots) ? sub.slots : [];
  const out = new Set();
  for (const id of slots) {
    const ventana = normalizeWindow(id);
    if (ventana) out.add(ventana);
  }
  if (!out.size && slots.length === 0) out.add('inicio');
  return [...out];
}

/**
 * Posiciones ya reservadas. El plan viejo de Home reserva la tarjeta de Inicio,
 * no el resto de lugares de esa ventana.
 */
export function ownedPositions(sub) {
  if (!activeSub(sub)) return [];
  const out = new Set();
  for (const id of Array.isArray(sub.posiciones) ? sub.posiciones : []) {
    if (isPositionId(id)) out.add(id);
  }
  const slots = Array.isArray(sub.slots) ? sub.slots : [];
  if (slots.includes('home_rail') || slots.length === 0) out.add('home_rail');
  if (slots.includes('explorar_mid')) out.add('explorar_mid');
  if (slots.includes('cerca_top')) out.add('cerca_top');
  if (slots.includes('side_left')) {
    out.add('side_left');
    out.add('inicio_side_left');
    out.add('explorar_side_left');
  }
  if (slots.includes('side_right')) {
    out.add('side_right');
    out.add('inicio_side_right');
    out.add('explorar_side_right');
  }
  for (const id of slots) {
    if (Object.values(AD_WINDOWS).some((list) => list.includes(id))) out.add(id);
  }
  return [...out];
}

/** El borrador elige ventana y, si quiere, una posición. Aleatoria no exige el extra. */
export function resolveCreativePlacement(body = {}) {
  const ventana =
    body.ventana === 'inicio' || body.ventana === 'explorar'
      ? body.ventana
      : normalizeWindow(body.slot);
  if (!ventana) {
    const err = new Error('Elige la ventana: Inicio o Explorar.');
    err.status = 400;
    throw err;
  }
  const allowed = AD_WINDOWS[ventana];
  let posicion = String(body.posicion || '').trim();
  if (!posicion) {
    const slot = String(body.slot || '');
    posicion = allowed.includes(slot) ? slot : 'aleatoria';
  }
  if (posicion !== 'aleatoria' && !allowed.includes(posicion)) {
    const err = new Error('Esa posición no está en la ventana que elegiste.');
    err.status = 400;
    throw err;
  }
  return {
    ventana,
    posicion,
    slot: posicion === 'aleatoria' ? 'aleatoria' : posicion,
  };
}

/**
 * El primer campo usa la cotización del plan. Cada campo nuevo cuesta el base
 * y se suma a los que ya están pagados.
 */
export function quoteSlotPurchase({
  plan = 'basic',
  sucursales = 1,
  slot,
  owned = [],
} = {}) {
  const ventana = normalizeWindow(slot);
  if (!ventana) {
    const err = new Error('Elige la ventana: Inicio o Explorar.');
    err.status = 400;
    throw err;
  }
  const have = new Set();
  for (const item of owned) {
    const ownedWindow = normalizeWindow(item);
    if (ownedWindow) have.add(ownedWindow);
  }
  if (have.has(ventana)) {
    const err = new Error('Esa ventana ya está pagada y sigue a tu disposición.');
    err.status = 409;
    throw err;
  }
  const first = have.size === 0;
  const baseQuote = quoteSubscription(plan, sucursales);
  if (first) {
    return {
      ...baseQuote,
      slot: ventana,
      kind: 'primer_campo',
      owned: [...have],
    };
  }
  return {
    plan: baseQuote.plan,
    sucursales: baseQuote.sucursales,
    base: EXTRA_SLOT_MXN,
    extra: 0,
    monto: EXTRA_SLOT_MXN,
    moneda: 'MXN',
    dias: DEFAULT_DAYS,
    includedBranches: baseQuote.includedBranches,
    extraPerBranch: baseQuote.extraPerBranch,
    slot: ventana,
    kind: 'campo_extra',
    owned: [...have],
  };
}

/** Reservar una posición concreta. Aleatoria no pasa por aquí. */
export function quotePositionPurchase({ position, windows = [], positions = [] } = {}) {
  const ventana = windowForPosition(position);
  if (!ventana) {
    const err = new Error('Elige una posición de Inicio o de Explorar.');
    err.status = 400;
    throw err;
  }
  if (!windows.includes(ventana)) {
    const err = new Error('Primero paga la ventana. La posición es un extra.');
    err.status = 402;
    throw err;
  }
  if (positions.includes(position)) {
    const err = new Error('Esa posición ya está pagada.');
    err.status = 409;
    throw err;
  }
  return {
    slot: position,
    kind: 'posicion',
    ventana,
    monto: POSITION_EXTRA_MXN,
    moneda: 'MXN',
    dias: DEFAULT_DAYS,
    plan: 'basic',
    sucursales: 1,
  };
}
