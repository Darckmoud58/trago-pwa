import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listFavorites,
  removeFavorite,
  syncFavorites,
  type FavoritePlace,
} from '../lib/favorites';
import { useI18n } from '../lib/i18n';
import './Favoritos.css';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function brandTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  const hue = 348 + (h % 22);
  const sat = 42 + (h % 18);
  const lit = 22 + (h % 10);
  return `hsl(${hue} ${sat}% ${lit}%)`;
}

export default function Favoritos() {
  const { t } = useI18n();
  const [items, setItems] = useState<FavoritePlace[]>([]);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  async function refresh() {
    await syncFavorites();
    setItems(await listFavorites());
  }

  useEffect(() => {
    void refresh();
    const on = () => {
      setOnline(true);
      void refresh();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  async function onRemove(id: string, type: FavoritePlace['type']) {
    await removeFavorite(id, type);
    await refresh();
  }

  return (
    <section className="favs-page">
      <header className="ui-hero favs-hero">
        <p className="ui-kicker">{t('navFavorites')}</p>
        <h2>{t('myFavorites')}</h2>
        <p className="meta">
          {online ? t('online') : t('offlineCache')}
          {items.length > 0 ? ` · ${items.length}` : ''}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="empty-state favs-empty">
          <p>{t('favEmpty')}</p>
          <p className="muted">
            {t('favEmptyHint')}{' '}
            <Link to="/cerca" viewTransition>
              {t('navNear')}
            </Link>
            .
          </p>
          <Link className="btn primary" to="/cerca" viewTransition>
            {t('favSearchNear')}
          </Link>
        </div>
      ) : (
        <ul className="favs-list stagger" data-reveal>
          {items.map((f) => {
            const mark = f.subtitulo || f.nombre;
            return (
              <li key={f.id} className="fav-card">

                <div
                  className="fav-mark"
                  style={{ background: brandTone(mark) }}
                  aria-hidden
                >
                  {initials(mark)}
                </div>
                <div className="fav-card-body">
                  <p className="label">
                    {f.type === 'empresa' ? t('typeBusiness') : t('typeBranch')}
                  </p>
                  <h3>{f.nombre}</h3>
                  {f.subtitulo && <p className="meta">{f.subtitulo}</p>}
                  {f.direccion && <p className="meta">{f.direccion}</p>}
                  {(f.colonia || f.municipio) && (
                    <p className="meta">
                      {[f.colonia, f.municipio].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {f.horario && <p className="meta">{f.horario}</p>}
                </div>
                <button
                  type="button"
                  className="btn ghost fav-remove"
                  onClick={() => void onRemove(f.id, f.type)}
                  aria-label={t('favRemoveAria', { name: f.nombre })}
                >
                  {t('favRemove')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
