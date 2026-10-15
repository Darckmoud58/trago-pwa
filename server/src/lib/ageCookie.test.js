import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  AGE_COOKIE,
  signAgeDeclaration,
  verifyAgeDeclaration,
} from './ageCookie.js';
import { requireEnv, resetEnvCache } from '../config/env.js';
import { canSeeRestricted } from './ageGate.js';

const SECRET = 'r1-age-cookie-secret-32chars-min!!';

describe('ageCookie R1', () => {
  before(() => {
    resetEnvCache();
    process.env.JWT_SECRET = SECRET;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27018/trago';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.NETLIFY = 'true';
    requireEnv();
  });

  after(() => resetEnvCache());

  it('firma y verifica adult/teen', () => {
    const t = signAgeDeclaration('adult');
    assert.equal(verifyAgeDeclaration(t), 'adult');
    assert.equal(verifyAgeDeclaration(signAgeDeclaration('teen')), 'teen');
  });

  it('rechaza token manipulado', () => {
    const t = signAgeDeclaration('adult');
    assert.equal(verifyAgeDeclaration(t.slice(0, -4) + 'xxxx'), null);
    assert.equal(verifyAgeDeclaration('not.a.jwt'), null);
  });

  it('HTTP: declare cookie; ?band= no abre alcohol; sin cookie anon', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();

    const anon = await request(app).get('/api/age/status');
    assert.equal(anon.body.band, 'anon');
    assert.equal(anon.body.canSeeRestricted, false);

    const declared = await request(app)
      .post('/api/age/declare')
      .send({ adult: true });
    assert.equal(declared.status, 200);
    assert.equal(declared.body.band, 'adult');
    const setCookie = declared.headers['set-cookie']?.join(';') || '';
    assert.match(setCookie, new RegExp(AGE_COOKIE));
    assert.match(setCookie, /HttpOnly/i);

    const withCookie = await request(app)
      .get('/api/age/status')
      .set('Cookie', declared.headers['set-cookie']);
    assert.equal(withCookie.body.band, 'adult');
    assert.equal(withCookie.body.canSeeRestricted, true);

    const spoof = await request(app)
      .get('/api/age/status')
      .query({ band: 'adult' })
      .set('X-Trago-Band', 'adult');
    assert.equal(spoof.body.band, 'anon');
    assert.equal(spoof.body.canSeeRestricted, false);

    assert.equal(canSeeRestricted({ band: 'adult', source: 'cookie' }), true);
  });
});
