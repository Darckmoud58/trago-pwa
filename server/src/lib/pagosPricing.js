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
