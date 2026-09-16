import type { BranchPromo, Promo } from "./types";

export type CrowdStatus = "vigente" | "en-duda" | "caduco" | "fuera";

export function isWithinDates(promo: Promo, now = new Date()): boolean {
  return now >= new Date(promo.startsAt) && now <= new Date(promo.endsAt);
}

/**
 * Vigencia híbrida:
 * - La cadena publica y marca sucursales oficiales.
 * - Los usuarios confirman o niegan si todavía aplica en esa sucursal.
 * - Si hay más reportes de caducado (margen de 2), se marca en duda / caduco.
 */
export function crowdStatus(link: BranchPromo): CrowdStatus {
  if (!link.officialActive) return "fuera";
  const { reportsVigente: yes, reportsCaduco: no } = link;
  if (no >= yes + 3 && no >= 3) return "caduco";
  if (no > yes && no >= 2) return "en-duda";
  return "vigente";
}

export function isShownAsActive(promo: Promo, link: BranchPromo, now = new Date()) {
  if (!isWithinDates(promo, now)) return false;
  const status = crowdStatus(link);
  return status === "vigente" || status === "en-duda";
}

export const STATUS_LABELS: Record<CrowdStatus, string> = {
  vigente: "Vigente aquí",
  "en-duda": "En duda",
  caduco: "Ya no aplica",
  fuera: "No participa",
};
