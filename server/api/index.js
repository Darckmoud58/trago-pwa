/**
 * Entry serverless Vercel — mismo patrón que Todo_pwa/server/api/index.js.
 * Root Directory del proyecto API = `server/`.
 */
import 'dotenv/config';
import { requireEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';

requireEnv();

export default createApp();
