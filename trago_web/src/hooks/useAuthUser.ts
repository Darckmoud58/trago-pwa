import { useEffect, useState } from 'react';
import { api, readToken, setAuth } from '../api';
import { isBirthdayToday } from '../lib/birthday';
import type { AuthUser } from '../types';

/** Sesión + bandera de cumple (solo cuenta + día en CDMX). */
export function useAuthUser() {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(readToken()));

  useEffect(() => {
    const sync = () => setToken(readToken());
    window.addEventListener('trago-session', sync);
    return () => window.removeEventListener('trago-session', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setAuth(token);
    api
      .get('/api/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.user as AuthUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const birth = user?.birthDate || user?.fecha_nacimiento || null;
  const birthdayToday = Boolean(token && birth && isBirthdayToday(birth));
  const firstName =
    user?.nombre ||
    (user?.name ? String(user.name).split(/\s+/)[0] : '') ||
    '';

  return { token, user, loading, birthdayToday, firstName, birth };
}

export function isBirthdayFreebie(promo: {
  nombre?: string;
  title?: string;
  descripcion?: string;
  subtitle?: string;
}) {
  const text = [promo.nombre, promo.title, promo.descripcion, promo.subtitle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /gratis|free|regalo|cortes[ií]a|sin\s*costo|on\s*the\s*house|0\s*\$/.test(
    text
  );
}
