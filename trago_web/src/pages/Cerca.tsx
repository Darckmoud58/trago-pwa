import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import FavoriteButton from '../components/FavoriteButton';
import { CACHE_KEYS, cacheGet, cacheSet } from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import type { Branch, Promo } from '../types';
import './Cerca.css';

const GDL = { lng: -103.3496, lat: 20.6767 };

export default function Cerca() {
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [sources, setSources] = useState<{ empresa: string; ok: boolean; count: number; reason?: string }[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    void cacheGet<{ branches: Branch[]; note: string }>(CACHE_KEYS.lastNear).then(
      (cached) => {
        if (cached?.data?.branches?.length && branches.length === 0) {
          setBranches(cached.data.branches);
          setNote(cached.data.note || t('lastSearchSaved'));
          setFromCache(true);
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNear(lng: number, lat: number, label: string) {
    setLoading(true);
    setError('');
    setNote(label);
    try {
      const { data } = await api.get('/api/sucursales/cerca', {
        params: { lng, lat, maxMeters: 8000 },
      });
      const list = (data.branches ?? data.ubicaciones ?? []) as Branch[];
      setBranches(list);
      setFromCache(false);
      try {
        const promoRes = await api.get('/api/promociones/cerca', { params: { lng, lat, maxMeters: 8000 } });
        setPromos((promoRes.data.promos ?? []) as Promo[]);
        setSources(promoRes.data.sources ?? []);
      } catch {
        setPromos([]);
        setSources([]);
      }
      await cacheSet(CACHE_KEYS.lastNear, { branches: list, note: label });
    } catch {
      const cached = await cacheGet<{ branches: Branch[]; note: string }>(
        CACHE_KEYS.lastNear
      );
      if (cached?.data?.branches?.length) {
        setBranches(cached.data.branches);
        setPromos([]);
        setSources([]);
        setNote(t('offlineLastSearch'));
        setFromCache(true);
        setError('');
      } else {
        setError(t('nearError'));
        setBranches([]);
      }
    } finally {
      setLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError(t('noGeo'));
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        void loadNear(
          pos.coords.longitude,
          pos.coords.latitude,
          t('usingLocation')
        ),
      () => void loadNear(GDL.lng, GDL.lat, t('locationDenied')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section className="cerca-page">
      <div className="cerca-actions">
        <button
          type="button"
          className="btn primary cerca-main-btn"
          onClick={useGps}
        >
          {t('useMyLocation')}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => void loadNear(GDL.lng, GDL.lat, t('centerGdl'))}
        >
          {t('demoCenter')}
        </button>
      </div>

      {(note || fromCache) && (
        <p className="cerca-note meta">
          {note}
          {fromCache ? t('cacheTag') : ''}
        </p>
      )}
      {loading && <p className="muted">{t('searching')}</p>}
      {error && <p className="error">{error}</p>}

      {sources.length > 0 && (
        <section className="nearby-promos">
          <h2>Promociones de empresas cercanas</h2>
          <p className="meta">Detectadas en páginas oficiales; confirma términos y vigencia con el negocio.</p>
          <ul className="branch-list">
            {promos.map((promo) => (
              <li key={promo._id} className="promo-card">
                <p className="label">{promo.chainName || 'Empresa'}</p>
                <h3><Link to={`/promos/${promo.slug || promo._id}`}>{promo.nombre || promo.title}</Link></h3>
                {(promo.descripcion || promo.subtitle) && <p>{promo.descripcion || promo.subtitle}</p>}
                {promo.url_fuente && <a href={promo.url_fuente} target="_blank" rel="noreferrer">Ver publicación oficial ↗</a>}
              </li>
            ))}
          </ul>
          <details>
            <summary>Estado de las fuentes consultadas</summary>
            <ul>{sources.map((source) => <li key={source.empresa}>{source.empresa}: {source.ok ? `${source.count} promociones` : source.reason || 'sin lectura'}</li>)}</ul>
          </details>
        </section>
      )}

      <ul className="branch-list cerca-list">
        {branches.map((b) => {
          const id = String(b._id);
          const nombre = b.nombre || b.name || t('branchFallback');
          const km =
            typeof b.distanceMeters === 'number'
              ? (b.distanceMeters / 1000).toFixed(2)
              : null;
          return (
            <li key={id} className="promo-card place-card cerca-card">
              <div className="place-card-top">
                <div>
                  <p className="label">
                    {b.chainName || t('businessFallback')}
                  </p>
                  <h3>{nombre}</h3>
                </div>
                <div className="cerca-card-right">
                  {km && <span className="dist-pill">{km} km</span>}
                  <FavoriteButton
                    place={{
                      id,
                      type: 'ubicacion',
                      nombre,
                      subtitulo: b.chainName,
                      direccion: b.address,
                      colonia: b.colonia,
                      municipio: b.city,
                      horario: b.hours,
                      distanciaKm:
                        typeof b.distanceMeters === 'number'
                          ? b.distanceMeters / 1000
                          : undefined,
                    }}
                  />
                </div>
              </div>
              {b.address && <p className="meta">{b.address}</p>}
              {(b.colonia || b.city) && (
                <p className="meta">
                  {[b.colonia, b.city].filter(Boolean).join(', ')}
                </p>
              )}
              {b.hours && <p className="meta">{b.hours}</p>}
            </li>
          );
        })}
      </ul>

      {!loading && !error && branches.length === 0 && (
        <div className="empty-state">
          <p>{t('nearEmpty')}</p>
          <p className="muted">
            {t('nearEmptyHint')}{' '}
            <Link to="/favoritos">{t('navFavorites')}</Link>.
          </p>
        </div>
      )}
    </section>
  );
}
