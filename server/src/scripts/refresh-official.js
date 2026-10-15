/**
 * Refresco manual de scrapers oficiales.
 * Uso: cd server && npm run refresh
 */
import dotenv from 'dotenv';
import { requireEnv } from '../config/env.js';
import { connectDB } from '../db/connect.js';
import { refreshOfficialSources } from '../services/officialPromoJob.js';

dotenv.config();

async function main() {
  requireEnv();
  await connectDB();
  const sources = await refreshOfficialSources();
  console.log(
    JSON.stringify(
      {
        ok: true,
        count: sources.length,
        sources: sources.map((s) => ({
          empresa: s.empresa,
          ok: s.ok,
          count: s.count,
        })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
