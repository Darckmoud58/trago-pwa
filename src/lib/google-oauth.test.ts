import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appOrigin, originFromRequest } from "./google-oauth";

describe("appOrigin", () => {
  it("ignora APP_ORIGIN localhost si el request es público", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    delete process.env.URL;
    delete process.env.DEPLOY_PRIME_URL;
    const req = new Request("https://trago.netlify.app/api/auth/google", {
      headers: {
        host: "trago.netlify.app",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "trago.netlify.app",
      },
    });
    assert.equal(appOrigin(req), "https://trago.netlify.app");
  });

  it("usa URL de Netlify cuando existe", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.URL = "https://mi-trago.netlify.app";
    const req = new Request("http://localhost:3000/api/auth/google");
    assert.equal(appOrigin(req), "https://mi-trago.netlify.app");
    delete process.env.URL;
  });

  it("en local respeta localhost", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    delete process.env.URL;
    const req = new Request("http://localhost:3000/api/auth/google", {
      headers: { host: "localhost:3000" },
    });
    assert.equal(originFromRequest(req), "http://localhost:3000");
    assert.equal(appOrigin(req), "http://localhost:3000");
  });
});
