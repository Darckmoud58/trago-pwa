import type { Promo } from '../types';

/**
 * Etiqueta de precio para UI.
 * Confía en precioTexto del API (ya resuelto en servidor).
 * Fallback mínimo: no reparsea horas ni miles a ciegas.
 */
export function resolvePriceLabel(promo: Promo | null | undefined): string | null {
  if (!promo) return null;
  const direct = String(promo.precioTexto || promo.priceLabel || '').trim();
  if (direct) {
    if (/^consultar\s+precio$/i.test(direct)) return 'Consultar precio';
    return direct;
  }

  const stored = Number(promo.precio ?? promo.price);
  if (Number.isFinite(stored) && stored > 0) {
    return `$${stored % 1 === 0 ? stored.toFixed(0) : stored.toFixed(2)}`;
  }

  return null;
}

export function resolveListPriceLabel(
  promo: Promo | null | undefined
): string | null {
  if (!promo) return null;
  const label = resolvePriceLabel(promo);
  // No tachar si el principal es "Desde" o "Consultar"
  if (label && /^(desde|consultar|\+)/i.test(label)) return null;

  const n = Number(promo.precioLista ?? promo.listPrice);
  if (!Number.isFinite(n) || n <= 0) return null;
  const current = Number(promo.precio ?? promo.price);
  if (Number.isFinite(current) && current > 0 && n <= current) return null;
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}
