import {
  collectNearbyPromos,
  ensureOfficialCompanies,
} from './officialPromoCollector.js';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** Último estado de refresco (para listPromos sin scrapear). */
let lastRefresh = {
  at: null,
  sources: [],
  error: null,
};

let timer = null;
let running = false;

export function getOfficialRefreshStatus() {
  return { ...lastRefresh };
}

/** Refresca scrapers de empresas con fuente oficial. No bloquea el listado público. */
export async function refreshOfficialSources() {
  if (running) return lastRefresh.sources;
  running = true;
  try {
    const companies = await ensureOfficialCompanies([], { allConfigured: true });
    if (!companies.length) {
      lastRefresh = { at: new Date(), sources: [], error: null };
      return [];
    }
    const sources = await collectNearbyPromos(companies);
    lastRefresh = { at: new Date(), sources, error: null };
    console.log(
      `[officialPromoJob] refresco OK · ${sources.length} fuentes · ${new Date().toISOString()}`
    );
    return sources;
  } catch (err) {
    const message = err?.message || String(err);
    console.error('[officialPromoJob] refreshOfficialSources:', message);
    lastRefresh = {
      at: new Date(),
      sources: lastRefresh.sources,
      error: message,
    };
    return lastRefresh.sources;
  } finally {
    running = false;
  }
}

/**
 * Arranca refresco al boot y cada 6 h.
 * Solo para proceso largo (server.js); no usar en Netlify Functions.
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
