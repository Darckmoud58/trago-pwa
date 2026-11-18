/** Preferencias de UI TraGo — localStorage + sync API. No inventa promos. */

export type UiDensity = 'comoda' | 'compacta';
export type PrefCategory = 'comida' | 'cafe' | 'antro' | 'destilados' | 'cumple';

export type UserPrefs = {
  categoriasFav: PrefCategory[];
  densidad: UiDensity;
  zona: string;
};

export const DEFAULT_PREFS: UserPrefs = {
  categoriasFav: [],
  densidad: 'comoda',
  zona: 'gdl',
};

export const PREF_CATEGORIES: PrefCategory[] = [
  'comida',
  'cafe',
  'antro',
  'destilados',
  'cumple',
];

const LS_KEY = 'trago_user_prefs_v1';

export function normalizePrefs(raw: unknown): UserPrefs {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const cats = Array.isArray(o.categoriasFav)
    ? o.categoriasFav
        .map((c) => String(c).toLowerCase())
        .filter((c): c is PrefCategory =>
          PREF_CATEGORIES.includes(c as PrefCategory)
        )
    : [];
  const densidad =
    o.densidad === 'compacta' || o.densidad === 'comoda'
      ? o.densidad
      : DEFAULT_PREFS.densidad;
  const zona = String(o.zona || DEFAULT_PREFS.zona)
    .trim()
    .toLowerCase()
    .slice(0, 32) || DEFAULT_PREFS.zona;
  return {
    categoriasFav: [...new Set(cats)],
    densidad,
    zona,
  };
}

export function readLocalPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeLocalPrefs(prefs: UserPrefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(normalizePrefs(prefs)));
  } catch {
    /* ignore quota */
  }
}

/** Une prefs servidor sobre local (servidor gana si trae datos). */
export function mergePrefs(
  local: UserPrefs,
  remote: Partial<UserPrefs> | null | undefined
): UserPrefs {
  if (!remote) return normalizePrefs(local);
  const r = normalizePrefs({ ...local, ...remote });
  if (
    Array.isArray(remote.categoriasFav) &&
    remote.categoriasFav.length === 0 &&
    local.categoriasFav.length > 0
  ) {
    // remoto vacío explícito: respeta vacío
    return r;
  }
  if (
    (!remote.categoriasFav || remote.categoriasFav.length === 0) &&
    local.categoriasFav.length > 0
  ) {
    return { ...r, categoriasFav: local.categoriasFav };
  }
  return r;
}

export function formatCacheAge(
  savedAt: number | null | undefined,
  t: (k: string, vars?: Record<string, string | number>) => string
): string {
  if (!savedAt || !Number.isFinite(savedAt)) return '';
  const mins = Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
  if (mins < 1) return t('cacheAgeJustNow');
  if (mins < 60) return t('cacheAgeMinutes', { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t('cacheAgeHours', { n: hrs });
  const days = Math.round(hrs / 24);
  return t('cacheAgeDays', { n: days });
}
