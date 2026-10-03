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
      <p className={`status-pill ${online ? 'on' : 'off'}`}>
        {online ? t('online') : t('offlineCache')}
      </p>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>{t('favEmpty')}</p>
          <p className="muted">
            {t('favEmptyHint')}{' '}
            <Link to="/cerca">{t('navNear')}</Link>.
          </p>
          <Link className="btn primary" to="/cerca">
            {t('favSearchNear')}
          </Link>
        </div>
      ) : (
        <ul className="branch-list favs-list">
          {items.map((f) => (
            <li key={f.id} className="promo-card fav-card">
              <div className="fav-card-body">
                <p className="label">
                  {f.type === 'empresa' ? t('typeBusiness') : t('typeBranch')}
                </p>
                <h3>{f.nombre}</h3>
                {f.subtitulo && <p>{f.subtitulo}</p>}
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
          ))}
        </ul>
      )}
    </section>
  );
}
