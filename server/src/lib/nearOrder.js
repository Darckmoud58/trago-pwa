/** Orden de cercanía. Sin sucursal medible, la promo va al final. */

export function nearestMeters(promo) {
  const rows = promo?.ubicacionesCercanas || [];
  let best = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const meters = Number(row?.distanceMeters);
    if (Number.isFinite(meters) && meters >= 0 && meters < best) best = meters;
  }
  return best;
}

export function sortBranchesByDistance(branches) {
  return [...(branches || [])].sort((a, b) => {
    const da = Number(a?.distanceMeters);
    const db = Number(b?.distanceMeters);
    const left = Number.isFinite(da) ? da : Number.POSITIVE_INFINITY;
    const right = Number.isFinite(db) ? db : Number.POSITIVE_INFINITY;
    return left - right;
  });
}

export function sortPromosByNearest(promos) {
  return [...(promos || [])].sort(
    (a, b) => nearestMeters(a) - nearestMeters(b)
  );
}
