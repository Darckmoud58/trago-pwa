import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { requireEnv } from '../../server/src/config/env.js';
import { createApp } from '../../server/src/app.js';
import { connectDB } from '../../server/src/db/connect.js';

dotenv.config();

try {
  requireEnv();
} catch (e) {
  console.error(e.message);
  throw e;
}

const app = createApp();

/**
 * Express 5 + serverless-http en Netlify a veces deja req.body vacío
 * (express.json no lee el stream del event). Parseamos el JSON aquí y
 * marcamos _body para que body-parser no lo pise con {}.
 */
const awsHandler = serverless(app, {
  request(req, event) {
    if (event.body == null || event.body === '') return;

    let raw = event.body;
    if (event.isBase64Encoded) {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    }
    if (typeof raw !== 'string') return;

    const headers = event.headers || {};
    const ct = String(
      headers['content-type'] || headers['Content-Type'] || ''
    ).toLowerCase();
    const looksJson =
      ct.includes('application/json') ||
      ct.includes('+json') ||
      raw.trim().startsWith('{') ||
      raw.trim().startsWith('[');

    if (!looksJson) return;

    try {
      req.body = JSON.parse(raw);
      req._body = true;
    } catch {
      /* express.json intentará de nuevo si el stream funciona */
    }
  },
});

let dbReady;

async function ensureDb() {
  if (!dbReady) {
    dbReady = connectDB().catch((err) => {
      dbReady = null;
      throw err;
    });
  }
  await dbReady;
}

/**
 * /api/* → /.netlify/functions/api/:splat
 * Reescribimos el path para que Express vea /api/...
 */
export async function handler(event, context) {
  await ensureDb();

  const raw =
    event.rawPath ||
    event.path ||
    (event.requestContext && event.requestContext.http
      ? event.requestContext.http.path
      : '') ||
    '';

  let apiPath = raw;
  if (apiPath.startsWith('/.netlify/functions/api')) {
    const rest = apiPath.slice('/.netlify/functions/api'.length);
    apiPath = '/api' + (rest || '');
  } else if (!apiPath.startsWith('/api')) {
    apiPath = '/api' + (apiPath.startsWith('/') ? apiPath : `/${apiPath}`);
  }

  event.path = apiPath;
  if (event.rawPath !== undefined) event.rawPath = apiPath;
  if (event.requestContext?.http) {
    event.requestContext.http.path = apiPath;
  }

  return awsHandler(event, context);
}
