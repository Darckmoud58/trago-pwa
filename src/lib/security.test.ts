import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeText, textFingerprint, hitRateLimit } from "./security";

describe("sanitizeText", () => {
  it("quita HTML y control chars", () => {
    assert.equal(sanitizeText("  hola <b>x</b>  "), "hola x");
  });
});

describe("textFingerprint", () => {
  it("normaliza espacios y mayúsculas", () => {
    assert.equal(textFingerprint("Hola  mundo"), textFingerprint("hola mundo"));
  });
});

describe("hitRateLimit", () => {
  it("bloquea al superar el límite", () => {
    const key = `test-${Date.now()}`;
    assert.equal(hitRateLimit(key, 2, 60_000).ok, true);
    assert.equal(hitRateLimit(key, 2, 60_000).ok, true);
    assert.equal(hitRateLimit(key, 2, 60_000).ok, false);
  });
});
