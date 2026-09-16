import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBranchOpen, parseHours } from "./hours";

describe("parseHours", () => {
  it("24 h", () => {
    const h = parseHours("24 h");
    assert.equal(h?.always, true);
  });

  it("rango diurno", () => {
    const h = parseHours("11:00 – 21:00");
    assert.equal(h?.start, 11 * 60);
    assert.equal(h?.end, 21 * 60);
  });
});

describe("isBranchOpen", () => {
  it("abre de noche si el rango cruza medianoche", () => {
    const hours = "18:00 – 02:00";
    const night = new Date("2026-09-04T02:00:00.000Z");
    const morning = new Date("2026-09-03T16:00:00.000Z");
    assert.equal(isBranchOpen(hours, night), true);
    assert.equal(isBranchOpen(hours, morning), false);
  });

  it("24 h siempre", () => {
    assert.equal(isBranchOpen("24 h", new Date()), true);
  });
});
