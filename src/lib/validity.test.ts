import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crowdStatus, isShownAsActive, isWithinDates } from "./validity";
import type { BranchPromo, Promo } from "./types";

const promo: Promo = {
  id: "p",
  slug: "p",
  chainId: "c",
  title: "2x1",
  subtitle: "",
  kind: "2x1",
  isNocturno: false,
  alcohol: true,
  isBirthday: false,
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-12-31T23:59:59.000Z",
  terms: "",
  imageUrl: "",
  featured: false,
  isDemo: true,
};

describe("crowdStatus", () => {
  it("fuera si la cadena no participa", () => {
    const link: BranchPromo = {
      promoId: "p",
      branchId: "b",
      officialActive: false,
      reportsVigente: 10,
      reportsCaduco: 0,
    };
    assert.equal(crowdStatus(link), "fuera");
  });

  it("caduco con margen de reportes en contra", () => {
    const link: BranchPromo = {
      promoId: "p",
      branchId: "b",
      officialActive: true,
      reportsVigente: 1,
      reportsCaduco: 5,
    };
    assert.equal(crowdStatus(link), "caduco");
    assert.equal(isShownAsActive(promo, link), false);
  });

  it("en duda con 2+ caducos y mayoría", () => {
    const link: BranchPromo = {
      promoId: "p",
      branchId: "b",
      officialActive: true,
      reportsVigente: 1,
      reportsCaduco: 2,
    };
    assert.equal(crowdStatus(link), "en-duda");
    assert.equal(isShownAsActive(promo, link), true);
  });

  it("vigente con más síes", () => {
    const link: BranchPromo = {
      promoId: "p",
      branchId: "b",
      officialActive: true,
      reportsVigente: 4,
      reportsCaduco: 1,
    };
    assert.equal(crowdStatus(link), "vigente");
  });
});

describe("isWithinDates", () => {
  it("respeta el rango", () => {
    assert.equal(isWithinDates(promo, new Date("2026-06-01T12:00:00.000Z")), true);
    assert.equal(isWithinDates(promo, new Date("2025-06-01T12:00:00.000Z")), false);
  });
});
