import { useEffect, useState } from 'react';
import {
  isFavorite,
  toggleFavorite,
  type FavoritePlace,
} from '../lib/favorites';
import { useI18n } from '../lib/i18n';

type Props = {
  place: Omit<FavoritePlace, 'savedAt'>;
};

export default function FavoriteButton({ place }: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void isFavorite(place.id).then((v) => {
      if (alive) setActive(v);
    });
    return () => {
      alive = false;
    };
  }, [place.id]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const now = await toggleFavorite(place);
      setActive(now);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`fav-btn ${active ? 'is-on' : ''}`}
      onClick={(e) => void onClick(e)}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? t('favAdded') : t('favAdd')}
      title={active ? t('favTitleOn') : t('favTitleOff')}
    >
      {active ? '♥' : '♡'}
    </button>
  );
}
