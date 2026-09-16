import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canViewPromo, filterPromosForViewer } from "./audience";
import type { Promo, SessionUser } from "./types";

const adult: SessionUser = {
  id: "1",
  email: "a@b.c",
  name: "A",
  isAdult: true,
  ageBand: "adult",
  birthDate: "2000-01-01",
};
const teen: SessionUser = {
  id: "2",
  email: "t@b.c",
  name: "T",
  isAdult: false,
  ageBand: "teen",
  birthDate: "2010-01-01",
};

const beer = {
  id: "p1",
  alcohol: true,
  audience: "adult" as const,
};
const lego = {
  id: "p2",
  alcohol: false,
  audience: "all" as const,
};

describe("audience", () => {
  it("oculta alcohol a visitante y joven", () => {
    assert.equal(canViewPromo(beer, null), false);
    assert.equal(canViewPromo(beer, teen), false);
    assert.equal(canViewPromo(beer, adult), true);
  });

  it("muestra generales a todos", () => {
    assert.equal(canViewPromo(lego, null), true);
    assert.equal(canViewPromo(lego, teen), true);
    assert.equal(canViewPromo(lego, adult), true);
  });

  it("filtra listas", () => {
    const list = [beer, lego] as Pick<Promo, "id" | "alcohol" | "audience">[];
    assert.equal(filterPromosForViewer(list, teen).length, 1);
    assert.equal(filterPromosForViewer(list, adult).length, 2);
  });
});
