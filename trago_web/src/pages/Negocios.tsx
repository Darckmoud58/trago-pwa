import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import { useI18n } from '../lib/i18n';
import type { Negocio } from '../types';
import './Promos.css';

export default function Negocios() {
  const { t } = useI18n();
  const [items, setItems] = useState<Negocio[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .get('/api/negocios')
      .then((res) => setItems(res.data.negocios ?? res.data.empresas ?? []))
      .catch(() => setError(t('businessesError')))
      .finally(() => setLoading(false));
  }, [t]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      const hay = [n.nombre, n.name, n.description, n.descripcion, n.kind]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const countLabel =
    visible.length === 1
      ? t('businessCount', { n: visible.length })
      : t('businessCountPlural', { n: visible.length });

  return (
    <section className="promos-page">
      <header className="promos-head">
        <p className="label">{t('directory')}</p>
        <h1>{t('titleBusinesses')}</h1>
        <p className="lead">
          {t('businessesLead')}{' '}
          <Link to="/favoritos">{t('navFavorites').toLowerCase()}</Link>.
        </p>
      </header>

      <div className="promos-toolbar">
        <label className="promos-search">
          <span className="sr-only">{t('searchBusiness')}</span>
          <input
            type="search"
            placeholder={t('searchBusinessPh')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <p className="promos-count meta">
        {loading ? t('loading') : countLabel}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="promo-grid">
        {visible.map((n) => {
          const id = String(n._id);
          const nombre = n.nombre || n.name || t('businessFallback');
          const desc = n.description || n.descripcion;
          return (
            <article key={id} className="promo-card place-card">
              <div className="place-card-top">
                <p className="label">{n.kind || n.plan || t('chainFallback')}</p>
                <FavoriteButton
                  place={{
                    id,
                    type: 'empresa',
                    nombre,
                    subtitulo: desc,
                  }}
                />
              </div>
              <h3>{nombre}</h3>
              {desc && <p className="meta">{desc}</p>}
            </article>
          );
        })}
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state promos-empty">
          <p>{t('businessesEmpty')}</p>
        </div>
      )}
    </section>
  );
}
