import { useCallback, useEffect, useState } from 'react';
import { api, readToken } from '../api';
import {
  mergePrefs,
  normalizePrefs,
  readLocalPrefs,
  writeLocalPrefs,
  type UserPrefs,
} from '../lib/userPrefs';

/**
 * Preferencias de UI: local siempre; con sesión intenta sync GET/PATCH.
 */
export function useUserPrefs() {
  const [prefs, setPrefs] = useState<UserPrefs>(() => readLocalPrefs());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = readToken();
    const local = readLocalPrefs();
    setPrefs(local);

    if (!token) {
      setReady(true);
      return;
    }

    api
      .get('/api/auth/me')
      .then((res) => {
        if (cancelled) return;
        const remote = res.data?.user?.preferencias;
        const merged = mergePrefs(local, remote);
        setPrefs(merged);
        writeLocalPrefs(merged);
        // Si local tenía cats y remoto vacío, sube merge
        if (
          local.categoriasFav.length > 0 &&
          (!remote?.categoriasFav || remote.categoriasFav.length === 0)
        ) {
          void api
            .patch('/api/auth/preferencias', merged)
            .catch(() => {});
        }
      })
      .catch(() => {
        /* keep local */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<UserPrefs>) => {
    const next = normalizePrefs({ ...readLocalPrefs(), ...patch });
    setPrefs(next);
    writeLocalPrefs(next);
    document.documentElement.dataset.density = next.densidad;
    if (!readToken()) return next;
    try {
      const res = await api.patch('/api/auth/preferencias', next);
      const saved = normalizePrefs(res.data?.preferencias || next);
      setPrefs(saved);
      writeLocalPrefs(saved);
      return saved;
    } catch {
      return next;
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = prefs.densidad;
  }, [prefs.densidad]);

  return { prefs, ready, updatePrefs };
}
