import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
  parseEnv,
  requireEnv,
  resetEnvCache,
} from '../config/env.js';
import {
  registerSchema,
  ageFromBirthDateStrict,
} from './authValidate.js';
import { errorHandler } from '../middleware/errorHandler.js';

const GOOD_SECRET = 'a'.repeat(32);
const GOOD_URI = 'mongodb://127.0.0.1:27018/trago';

describe('env P1', () => {
  after(() => resetEnvCache());

  it('rechaza JWT_SECRET corto o ausente', () => {
    assert.equal(parseEnv({ JWT_SECRET: 'changeme', MONGODB_URI: GOOD_URI }).success, false);
    assert.equal(parseEnv({ MONGODB_URI: GOOD_URI }).success, false);
    assert.equal(
      parseEnv({ JWT_SECRET: GOOD_SECRET, MONGODB_URI: GOOD_URI }).success,
      true
    );
  });

  it('requireEnv lanza sin secret', () => {
    resetEnvCache();
    assert.throws(() => requireEnv({ MONGODB_URI: GOOD_URI }), /JWT_SECRET/);
  });
});

describe('registerSchema P1', () => {
  it('exige birthDate y rechaza password corta/larga', () => {
    const base = {
      name: 'Mario TraGo',
      email: 'mario@example.com',
      password: 'TraGo123!',
      birthDate: '2000-01-15',
    };
    assert.equal(registerSchema.safeParse(base).success, true);
    assert.equal(
      registerSchema.safeParse({ ...base, birthDate: undefined, edad: 25 }).success,
      false
    );
    assert.equal(
      registerSchema.safeParse({ ...base, password: 'short7' }).success,
      false
    );
    assert.equal(
      registerSchema.safeParse({ ...base, password: 'x'.repeat(73) }).success,
      false
    );
  });

  it('calcula edad y rechaza <13 con mensaje neutro', () => {
    assert.ok(ageFromBirthDateStrict('2000-01-01') >= 18);
    assert.throws(() => ageFromBirthDateStrict('2020-01-01'), /No pudimos crear/);
  });
});

describe('errorHandler P1', () => {
  it('nunca incluye stack en la respuesta', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at secret.js:1';
    let body;
    let status;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };
    errorHandler(err, {}, res, () => {});
    assert.equal(status, 500);
    assert.equal(body.message, 'Error del servidor');
    assert.equal(JSON.stringify(body).includes('secret.js'), false);
  });
});

describe('HTTP P1', () => {
  let app;

  before(async () => {
    resetEnvCache();
    process.env.JWT_SECRET = GOOD_SECRET;
    process.env.MONGODB_URI = GOOD_URI;
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.NETLIFY = 'true';
    requireEnv();
    const mod = await import('../app.js');
    app = mod.createApp();
  });

  after(() => resetEnvCache());

  it('GET / solo ok', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.equal(res.body.collections, undefined);
  });

  it('origen CORS no listado no recibe Allow-Origin', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'https://evil.example');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('origen permitido recibe Allow-Origin', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  it('token firmado con changeme es 401', async () => {
    const bad = jwt.sign({ id: '507f1f77bcf86cd799439011', tv: 0 }, 'changeme', {
      algorithm: 'HS256',
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${bad}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.stack, undefined);
  });

  it('métricas norte niega JWT sin admin real en DB', async () => {
    const userTok = jwt.sign(
      { id: '507f1f77bcf86cd799439011', role: 'admin', tv: 0 },
      GOOD_SECRET,
      { algorithm: 'HS256' }
    );
    const res = await request(app)
      .get('/api/metricas/norte')
      .set('Authorization', `Bearer ${userTok}`);
    // Usuario inexistente → 401 en auth; claim admin en JWT no basta.
    assert.ok([401, 403].includes(res.status));
  });

  it('helmet oculta X-Powered-By', async () => {
    const res = await request(app).get('/');
    assert.equal(res.headers['x-powered-by'], undefined);
  });
});
