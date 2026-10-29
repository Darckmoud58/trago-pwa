/**
 * Entry serverless Vercel — mismo patrón que Todo_pwa/server/api/index.js.
 * Root Directory del proyecto API = `server/`.
 * Mongo se asegura por request (cache en globalThis).
 */
import 'dotenv/config';
import { requireEnv } from '../src/config/env.js';
import { connectDB } from '../src/db/connect.js';
import { createApp } from '../src/app.js';

requireEnv();
const app = createApp();

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
