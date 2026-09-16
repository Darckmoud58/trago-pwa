import type { Catalog, Promo, SessionUser } from "./types";

/** Quién puede ver la promo. Alcohol fuerza adult. */
export type PromoAudience = "all" | "adult";

export function resolveAudience(promo: Pick<Promo, "alcohol" | "audience">): PromoAudience {
  if (promo.alcohol) return "adult";
  return promo.audience ?? "all";
}

export function canViewPromo(
  promo: Pick<Promo, "alcohol" | "audience">,
  viewer: Pick<SessionUser, "isAdult"> | null,
): boolean {
  const audience = resolveAudience(promo);
  if (audience === "adult") return viewer?.isAdult === true;
  return true;
}

export function filterPromosForViewer<T extends Pick<Promo, "id" | "alcohol" | "audience">>(
  promos: T[],
  viewer: Pick<SessionUser, "isAdult"> | null,
): T[] {
  return promos.filter((p) => canViewPromo(p, viewer));
}

export function filterCatalogForViewer(catalog: Catalog, viewer: SessionUser | null): Catalog {
  const promos = filterPromosForViewer(catalog.promos, viewer);
  const ids = new Set(promos.map((p) => p.id));
  return {
    ...catalog,
    promos,
    branchPromos: catalog.branchPromos.filter((l) => ids.has(l.promoId)),
  };
}
