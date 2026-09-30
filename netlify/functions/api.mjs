import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { createApp } from '../../server/src/app.js';
import { connectDB } from '../../server/src/db/connect.js';

dotenv.config({ path: new URL('../../server/.env', import.meta.url).pathname });

const app = createApp();
const awsHandler = serverless(app);

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
