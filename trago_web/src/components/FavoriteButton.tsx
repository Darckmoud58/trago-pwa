import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  isFavorite,
  isFavoritesSession,
  stashPendingFavorite,
  toggleFavorite,
  type FavoritePlace,
} from '../lib/favorites';
import { useI18n } from '../lib/i18n';

type Props = {
  place: Omit<FavoritePlace, 'savedAt'>;
  /** overlay = círculo sobre portada (detalle de promo) */
  variant?: 'default' | 'overlay';
  className?: string;
};

export default function FavoriteButton({
  place,
  variant = 'default',
  className = '',
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => isFavoritesSession());

  useEffect(() => {
    const syncSession = () => setLoggedIn(isFavoritesSession());
    syncSession();
    window.addEventListener('storage', syncSession);
    window.addEventListener('focus', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('focus', syncSession);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!loggedIn) {
      setActive(false);
      return () => {
        alive = false;
      };
    }
    void isFavorite(place.id, place.type).then((v) => {
      if (alive) setActive(v);
    });
    return () => {
      alive = false;
    };
  }, [place.id, place.type, loggedIn]);

  function goLogin() {
    const returnTo = `${location.pathname}${location.search}`;
    stashPendingFavorite(place, returnTo);
    navigate('/entrar', {
      replace: false,
      state: { from: returnTo, reason: 'favorite' },
    });
  }

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    // Siempre re-checar token (no confiar solo en state).
    if (!isFavoritesSession()) {
      setActive(false);
      setLoggedIn(false);
      goLogin();
      return;
    }

    setBusy(true);
    try {
      const now = await toggleFavorite(place);
      setActive(now);
      setLoggedIn(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'login-required') {
        setActive(false);
        setLoggedIn(false);
        goLogin();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`fav-btn${variant === 'overlay' ? ' fav-btn-overlay' : ''}${active && loggedIn ? ' is-on' : ''}${!loggedIn ? ' needs-login' : ''}${className ? ` ${className}` : ''}`}
      onClick={(e) => void onClick(e)}
      disabled={busy}
      aria-pressed={active && loggedIn}
      aria-label={
        !loggedIn ? t('favNeedLogin') : active ? t('favAdded') : t('favAdd')
      }
      title={
        !loggedIn
          ? t('favNeedLogin')
          : active
            ? t('favTitleOn')
            : t('favTitleOff')
      }
    >
      <span className="fav-btn-icon" aria-hidden>
        {active && loggedIn ? '♥' : '♡'}
      </span>
    </button>
  );
}
