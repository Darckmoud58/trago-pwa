/** Puntos TraGo: la calle gana cupones; la cadena gana reputación. */
export const POINTS_VOTE = 5;
/** Solo se otorgan cerca de la sucursal (anti-farmeo remoto). */
export const POINTS_REVIEW_NEAR = 15;
export const POINTS_REVIEW_REMOTE = 0;
export const COUPON_COST = 50;

export const COUPON_LABEL =
  "Cupón TraGo · cortesía de socio (bebida o postre según el local participante)";

export function couponCode(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TRAGO-${part}`;
}
