import dotenv from 'dotenv';
import { requireEnv } from '../../server/src/config/env.js';
import { connectDB } from '../../server/src/db/connect.js';
import { runBirthdayPushJob } from '../../server/src/services/birthdayPushJob.js';
import { vapidConfigured } from '../../server/src/lib/push.js';

dotenv.config();

/**
 * Scheduled Function: push de cumpleaños (~09:00 America/Mexico_City ≈ 15:00 UTC).
 * Auth: x-cron-secret si CRON_SECRET está definido (igual que refresh-official).
 */
export const config = {
  schedule: '0 15 * * *',
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
    const isSchedule =
      event.headers?.['x-nf-event'] === 'schedule' ||
      event.isOfflineflareScheduled ||
      !event.httpMethod;
    if (!isSchedule && got !== cronSecret) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, message: 'No autorizado' }),
      };
    }
  }

  if (!vapidConfigured()) {
    return {
      statusCode: 503,
      body: JSON.stringify({ ok: false, message: 'VAPID no configurado' }),
    };
  }

  try {
    await connectDB();
    const result = await runBirthdayPushJob();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (e) {
    console.error('push-birthday:', e.message);
    const status = Number(e.status || e.statusCode) || 500;
    return {
      statusCode: status >= 400 ? status : 500,
      body: JSON.stringify({
        ok: false,
        message: status >= 500 ? 'Error al enviar push' : e.message,
      }),
    };
  }
}
