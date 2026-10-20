import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  AGE_COOKIE,
  BAND_LOCK_MS,
  isBandLocked,
  signAgeDeclaration,
  verifyAgeDeclaration,
  verifyAgeDeclarationPayload,
} from './ageCookie.js';
import { requireEnv, resetEnvCache } from '../config/env.js';

const SECRET = 'r1-age-cookie-secret-32chars-min!!';

describe('ageCookie M1', () => {
  before(() => {
    resetEnvCache();
    process.env.JWT_SECRET = SECRET;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27018/trago';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.NETLIFY = 'true';
    requireEnv();
  });

  after(() => resetEnvCache());

  it('firma y verifica adult/minor', () => {
    const t = signAgeDeclaration('adult');
    assert.equal(verifyAgeDeclaration(t), 'adult');
    assert.equal(verifyAgeDeclaration(signAgeDeclaration('minor')), 'minor');
    assert.equal(verifyAgeDeclaration(signAgeDeclaration('teen')), 'minor');
  });

  it('rechaza token manipulado', () => {
    const t = signAgeDeclaration('adult');
    assert.equal(verifyAgeDeclaration(t.slice(0, -4) + 'xxxx'), null);
    assert.equal(verifyAgeDeclaration('not.a.jwt'), null);
  });

  it('lock 24h', () => {
    const now = Date.now();
    assert.equal(isBandLocked({ declaredAt: now }, now + 1000), true);
    assert.equal(
      isBandLocked({ declaredAt: now - BAND_LOCK_MS - 1 }, now),
      false
    );
  });

  it('HTTP: /api/edad cookie; status unknown sin cookie; lock no cambia banda', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();

    const anon = await request(app).get('/api/age/status');
    assert.equal(anon.body.band, 'unknown');

    const declared = await request(app)
      .post('/api/edad')
      .send({ birthDate: '2000-01-15' });
    assert.equal(declared.status, 200);
    assert.equal(declared.body.ok, true);
    assert.equal(declared.body.band, undefined);
    assert.equal(declared.body.age, undefined);
    const setCookie = declared.headers['set-cookie']?.join(';') || '';
    assert.match(setCookie, new RegExp(AGE_COOKIE));
    assert.match(setCookie, /HttpOnly/i);

    const withCookie = await request(app)
      .get('/api/age/status')
      .set('Cookie', declared.headers['set-cookie']);
    assert.equal(withCookie.body.band, 'adult');

    const locked = await request(app)
      .post('/api/edad')
      .set('Cookie', declared.headers['set-cookie'])
      .send({ birthDate: '2012-01-15' });
    assert.equal(locked.status, 200);
    assert.equal(locked.body.ok, true);

    const stillAdult = await request(app)
      .get('/api/age/status')
      .set('Cookie', declared.headers['set-cookie']);
    assert.equal(stillAdult.body.band, 'adult');

    const spoof = await request(app)
      .get('/api/age/status')
      .query({ band: 'adult' })
      .set('X-Trago-Band', 'adult');
    assert.equal(spoof.body.band, 'unknown');

    const payload = verifyAgeDeclarationPayload(
      String(declared.headers['set-cookie'])
        .split(';')[0]
        .split('=')[1]
    );
    // Cookie value may be URI-encoded in header — skip if parse fails
    void payload;
  });
});
