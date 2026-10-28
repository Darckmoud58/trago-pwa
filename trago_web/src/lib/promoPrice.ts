import type { Promo } from '../types';

/** Etiqueta de precio solo si viene del API o del título oficial. No inventa. */
export function resolvePriceLabel(promo: Promo | null | undefined): string | null {
  if (!promo) return null;
  const direct = String(promo.precioTexto || promo.priceLabel || '').trim();
  if (direct) return direct;

  const stored = Number(promo.precio ?? promo.price);
  if (Number.isFinite(stored) && stored > 0) {
    return `$${stored % 1 === 0 ? stored.toFixed(0) : stored.toFixed(2)}`;
  }

  const text = [promo.nombre, promo.title, promo.descripcion, promo.subtitle]
    .filter(Boolean)
    .join(' — ');

  const multi = text.match(/(\d+)\s*[xX×]\s*\$\s*([\d]+(?:[.,]\d{1,2})?)/);
  if (multi) {
    const pack = Number(multi[1]);
    const amount = multi[2].replace(',', '');
    if (pack >= 2) return `${pack}× $${amount}`;
  }

  const money = text.match(/\$\s*([\d]+(?:[.,]\d{1,2})?)/);
  if (money) return `$${money[1].replace(',', '')}`;

  return null;
}

export function resolveListPriceLabel(promo: Promo | null | undefined): string | null {
  if (!promo) return null;
  const n = Number(promo.precioLista ?? promo.listPrice);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}
