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

/** Cada campo adicional, mismo precio base. No vuelve a cobrar las sucursales. */
export const EXTRA_SLOT_MXN = PLAN_BASE_MXN.basic;

export const AD_SLOTS = [
  'home_rail',
  'explorar_mid',
  'cerca_top',
  'side_left',
  'side_right',
];

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
  const listed = Array.isArray(sub?.slots)
    ? sub.slots.filter((slot) => AD_SLOTS.includes(slot))
    : [];
  if (listed.length) return [...new Set(listed)];
  if (sub && sub.activo && sub.estatus === 'activo') return ['home_rail'];
  return [];
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
  if (!AD_SLOTS.includes(slot)) {
    const err = new Error('Elige el campo publicitario que quieres pagar.');
    err.status = 400;
    throw err;
  }
  const have = [...new Set(owned.filter((item) => AD_SLOTS.includes(item)))];
  if (have.includes(slot)) {
    const err = new Error('Ese campo ya está pagado y sigue a tu disposición.');
    err.status = 409;
    throw err;
  }
  const first = have.length === 0;
  const baseQuote = quoteSubscription(plan, sucursales);
  if (first) {
    return { ...baseQuote, slot, kind: 'primer_campo', owned: have };
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
    slot,
    kind: 'campo_extra',
    owned: have,
  };
}
