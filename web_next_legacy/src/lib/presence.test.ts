import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNearBranch, parseGeo } from "./presence";

describe("isNearBranch", () => {
  const oxxo = { lat: 20.6767, lng: -103.3474 };

  it("acepta ~100 m", () => {
    assert.equal(isNearBranch({ lat: 20.6775, lng: -103.3474 }, oxxo, 0.4), true);
  });

  it("rechaza varios kilómetros", () => {
    assert.equal(isNearBranch({ lat: 19.43, lng: -99.13 }, oxxo, 0.4), false);
  });
});

describe("parseGeo", () => {
  it("valida rangos", () => {
    assert.equal(parseGeo(20.67, -103.34)?.lat, 20.67);
    assert.equal(parseGeo(200, 0), null);
    assert.equal(parseGeo("x", "y"), null);
  });
});
