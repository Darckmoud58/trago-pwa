import OfficialRefresh from '../models/OfficialRefresh.js';
import {
  collectNearbyPromos,
  ensureOfficialCompanies,
} from './officialPromoCollector.js';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let memoryCache = { at: null, sources: [], error: null };
let timer = null;
let running = false;

export async function getOfficialRefreshStatus() {
  try {
    const doc = await OfficialRefresh.findOne({ key: 'global' }).lean();
    if (doc) {
      memoryCache = {
        at: doc.at || null,
        sources: doc.sources || [],
        error: doc.error || null,
      };
    }
  } catch {
    /* sin DB aún */
  }
  return { ...memoryCache };
}

async function persistStatus(next) {
  memoryCache = next;
  try {
    await OfficialRefresh.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          at: next.at,
          sources: next.sources,
          error: next.error,
        },
        $setOnInsert: { key: 'global' },
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error('[officialPromoJob] persist:', e.message);
  }
}

/** Refresca scrapers. No debe llamarse desde el hot path de list/cerca. */
export async function refreshOfficialSources() {
  if (running) return (await getOfficialRefreshStatus()).sources;
  running = true;
  try {
    const companies = await ensureOfficialCompanies([], { allConfigured: true });
    if (!companies.length) {
      await persistStatus({ at: new Date(), sources: [], error: null });
      return [];
    }
    const sources = await collectNearbyPromos(companies);
    await persistStatus({ at: new Date(), sources, error: null });
    console.log(
      `[officialPromoJob] refresco OK · ${sources.length} fuentes · ${new Date().toISOString()}`
    );
    return sources;
  } catch (err) {
    const message = err?.message || String(err);
    console.error('[officialPromoJob] refreshOfficialSources:', message);
    const prev = await getOfficialRefreshStatus();
    await persistStatus({
      at: new Date(),
      sources: prev.sources,
      error: message,
    });
    return prev.sources;
  } finally {
    running = false;
  }
}

/**
 * Solo proceso largo (server.js). En Netlify usa Scheduled Function.
 */
export function startOfficialPromoJob({ immediate = true } = {}) {
  if (timer) return;
  if (immediate) {
    void refreshOfficialSources();
  }
  timer = setInterval(() => {
    void refreshOfficialSources();
  }, SIX_HOURS_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

export function stopOfficialPromoJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
