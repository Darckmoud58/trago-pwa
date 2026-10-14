import dotenv from 'dotenv';
import { requireEnv } from '../../server/src/config/env.js';
import { connectDB } from '../../server/src/db/connect.js';
import { refreshOfficialSources } from '../../server/src/services/officialPromoJob.js';

dotenv.config();

/**
 * Scheduled Function: refresca scrapers oficiales cada 6 h.
 * En Netlify no hay setInterval persistente tras createApp().
 *
 * Auth opcional: header x-cron-secret === CRON_SECRET (si está definido).
 */
export const config = {
  schedule: '0 */6 * * *',
};

export async function handler(event) {
  try {
    requireEnv();
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: e.message }),
    };
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const got =
      event.headers?.['x-cron-secret'] ||
      event.headers?.['X-Cron-Secret'] ||
      '';
    const isSchedule = event.headers?.['x-nf-event'] === 'schedule' ||
      event.isOfflineflareScheduled ||
      !event.httpMethod;
    if (!isSchedule && got !== cronSecret) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, message: 'No autorizado' }),
      };
    }
  }

  try {
    await connectDB();
    const sources = await refreshOfficialSources();
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        at: new Date().toISOString(),
        sources: sources.length,
      }),
    };
  } catch (e) {
    console.error('refresh-official:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: 'Error al refrescar' }),
    };
  }
}
