import { haversineKm } from "./geo";
import { isBranchOpen } from "./hours";
import type { Branch, BranchPromo, Catalog, Chain, GeoPoint, Promo } from "./types";
import { crowdStatus, isShownAsActive, isWithinDates } from "./validity";

export function catalogFrom(
  chains: Chain[],
  branches: Branch[],
  promos: Promo[],
  branchPromos: BranchPromo[],
): Catalog {
  return { chains, branches, promos, branchPromos };
}

export function getChain(catalog: Catalog, id: string) {
  return catalog.chains.find((c) => c.id === id);
}

export function getChainBySlug(catalog: Catalog, slug: string) {
  return catalog.chains.find((c) => c.slug === slug);
}

export function getPromoBySlug(catalog: Catalog, slug: string) {
  return catalog.promos.find((p) => p.slug === slug);
}

export function getBranchBySlug(catalog: Catalog, slug: string) {
  return catalog.branches.find((b) => b.slug === slug);
}

export function getBranch(catalog: Catalog, id: string) {
  return catalog.branches.find((b) => b.id === id);
}

export function branchesForPromo(catalog: Catalog, promoId: string) {
  return catalog.branchPromos
    .filter((l) => l.promoId === promoId)
    .map((link) => {
      const branch = catalog.branches.find((b) => b.id === link.branchId);
      if (!branch) return null;
      return { branch, link };
    })
    .filter((row): row is { branch: Branch; link: BranchPromo } => row !== null);
}

export function promosForBranch(catalog: Catalog, branchId: string) {
  return catalog.branchPromos
    .filter((l) => l.branchId === branchId)
    .map((link) => {
      const promo = catalog.promos.find((p) => p.id === link.promoId);
      if (!promo) return null;
      return { promo, link };
    })
    .filter((row): row is { promo: Promo; link: BranchPromo } => row !== null);
}

export function nearestActiveForPromo(catalog: Catalog, promo: Promo, origin: GeoPoint) {
  const rows = branchesForPromo(catalog, promo.id).filter(({ link }) =>
    isShownAsActive(promo, link),
  );
  if (rows.length === 0) return null;
  return rows
    .map((row) => ({
      ...row,
      km: haversineKm(origin, row.branch.geo),
      status: crowdStatus(row.link),
    }))
    .sort((a, b) => a.km - b.km)[0];
}

export function nearbyPromos(
  catalog: Catalog,
  origin: GeoPoint,
  opts?: { nocturno?: boolean; birthday?: boolean; maxKm?: number },
) {
  const maxKm = opts?.maxKm ?? 25;
  return catalog.promos
    .filter((p) => isWithinDates(p))
    .filter((p) => (opts?.nocturno ? p.isNocturno : true))
    .filter((p) => (opts?.birthday ? p.isBirthday : true))
    .map((promo) => {
      const nearest = nearestActiveForPromo(catalog, promo, origin);
      return nearest ? { promo, nearest } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.nearest.km <= maxKm)
    .filter((row) => (opts?.nocturno ? isBranchOpen(row.nearest.branch.hours) : true))
    .sort((a, b) => a.nearest.km - b.nearest.km);
}
