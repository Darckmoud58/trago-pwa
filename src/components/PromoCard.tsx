"use client";

import Link from "next/link";
import type { Branch, BranchPromo, Promo } from "@/lib/types";
import { KIND_LABELS } from "@/lib/types";
import { crowdStatus, STATUS_LABELS } from "@/lib/validity";
import { formatKm } from "@/lib/geo";
import { isBranchOpen } from "@/lib/hours";
import { branchesForPromo, getChain } from "@/lib/catalog";
import { ChainMark } from "./ChainMark";
import { useCatalog } from "./CatalogProvider";

export function PromoCard({
  promo,
  km,
  branch,
  link,
}: {
  promo: Promo;
  km?: number;
  branch?: Branch;
  link?: BranchPromo;
}) {
  const catalog = useCatalog();
  const chain = getChain(catalog, promo.chainId);
  const status = link ? crowdStatus(link) : null;
  const storeNames =
    branch?.name ??
    branchesForPromo(catalog, promo.id)
      .map((row) => row.branch.name)
      .join(" · ");

  return (
    <Link
      href={`/promos/${promo.slug}`}
      className="group block overflow-hidden border border-white/10 bg-white/[0.03] transition hover:border-[var(--copper)]/50"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={promo.imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08110e] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 bg-[#08110e]/80 px-2 py-1 text-[11px] uppercase tracking-wider text-[var(--gold)]">
          {KIND_LABELS[promo.kind]}
          {promo.sourceUrl ? " · página oficial" : promo.isDemo ? " · demo" : ""}
        </span>
      </div>
      <div className="space-y-2 p-4">
        {chain && (
          <div className="flex items-center gap-2">
            <ChainMark chain={chain} size="sm" />
            <p className="text-sm font-semibold tracking-wide text-[var(--foam)]">{chain.name}</p>
          </div>
        )}
        <h3 className="font-display text-2xl leading-tight text-[var(--foam)]">{promo.title}</h3>
        <p className="text-base text-[var(--gold)]">{storeNames}</p>
        {branch && (
          <p className="text-sm text-[var(--muted)]">
            {branch.address} · {branch.colonia}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[var(--gold)]">
          {typeof km === "number" && <span>{formatKm(km)}</span>}
          {status && <span>{STATUS_LABELS[status]}</span>}
          {branch && !isBranchOpen(branch.hours) && (
            <span className="text-[var(--muted)]">Cerrado ahora</span>
          )}
        </div>
      </div>
    </Link>
  );
}
