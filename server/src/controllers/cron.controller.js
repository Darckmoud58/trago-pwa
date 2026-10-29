import { cronAuthorized } from '../lib/cronAuth.js';
import { refreshOfficialSources } from '../services/officialPromoJob.js';

/** POST/GET /api/cron/refresh-official — scrapers oficiales (GitHub Actions / Vercel). */
export async function refreshOfficial(req, res) {
  if (!cronAuthorized(req)) {
    return res.status(401).json({ ok: false, message: 'No autorizado' });
  }

  try {
    const sources = await refreshOfficialSources();
    return res.json({
      ok: true,
      sources: sources?.length ?? 0,
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('cron refresh-official:', e.message);
    return res.status(500).json({
      ok: false,
      message: e.message || 'Error del servidor',
    });
  }
}
