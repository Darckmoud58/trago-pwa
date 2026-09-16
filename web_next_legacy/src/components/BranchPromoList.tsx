"use client";

import Link from "next/link";
import { ValidityVote } from "./ValidityVote";
import { useGeo } from "./GeoProvider";
import { formatKm, haversineKm } from "@/lib/geo";
import { VENUE_LABELS, type Branch, type BranchPromo, type Promo } from "@/lib/types";
import { crowdStatus, isShownAsActive, STATUS_LABELS } from "@/lib/validity";

export function BranchPromoList({
  promo,
  rows,
}: {
  promo: Promo;
  rows: { branch: Branch; link: BranchPromo }[];
}) {
  const { origin } = useGeo();
  const sorted = [...rows].sort(
    (a, b) => haversineKm(origin, a.branch.geo) - haversineKm(origin, b.branch.geo),
  );

  return (
    <ul className="divide-y divide-white/8 border border-white/10">
      {sorted.map(({ branch, link }) => {
        const km = haversineKm(origin, branch.geo);
        const active = isShownAsActive(promo, link);
        const status = crowdStatus(link);
        return (
          <li key={branch.id} className="p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/sucursales/${branch.slug}`}
                  className="font-display text-xl text-[var(--foam)] hover:text-[var(--gold)]"
                >
                  {branch.name}
                </Link>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {VENUE_LABELS[branch.kind]} · {branch.colonia} · {formatKm(km)}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {branch.address} · {branch.hours}
                </p>
              </div>
              <span
                className={`text-xs uppercase tracking-wider ${
                  active ? "text-[var(--gold)]" : "text-[var(--muted)]"
                }`}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            {link.officialActive && (
              <ValidityVote
                promoId={promo.id}
                branchId={branch.id}
                link={link}
                branchGeo={branch.geo}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
