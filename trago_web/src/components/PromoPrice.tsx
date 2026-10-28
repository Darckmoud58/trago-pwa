import {
  resolveListPriceLabel,
  resolvePriceLabel,
} from '../lib/promoPrice';
import type { Promo } from '../types';

type Props = {
  promo: Promo;
  className?: string;
};

/** Muestra precio solo si la fuente lo publicó o viene en el título. */
export default function PromoPrice({ promo, className = '' }: Props) {
  const label = resolvePriceLabel(promo);
  if (!label) return null;
  const before = resolveListPriceLabel(promo);
  return (
    <span className={`promo-price ${className}`.trim()}>
      <strong>{label}</strong>
      {before ? <s>{before}</s> : null}
    </span>
  );
}
