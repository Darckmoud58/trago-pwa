import { useState } from 'react';
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
  const [promosError, setPromosError] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  async function loadNear(lng: number, lat: number, label: string) {
    setLoading(true);
    setError('');
    setNote(label);
    setBranches([]);
    setPromos([]);
    setSources([]);
    setPromosError(false);
    setFromCache(false);
    try {
      const { data } = await api.get('/api/sucursales/cerca', {
        params: { lng, lat, maxMeters: 8000 },
      });
      const list = (data.branches ?? data.ubicaciones ?? []) as Branch[];
      setBranches(list);
      setFromCache(false);
      if (data.partial && data.searchedRadiusMeters) {
        const km = (data.searchedRadiusMeters / 1000).toFixed(1);
        const reducedNote = t('osmReducedRadius').replace('{km}', km);
        setNote(`${label} · ${reducedNote}`);
      }
      try {
        const promoRes = await api.get('/api/promociones/cerca', { params: { lng, lat, maxMeters: 8000 } });
        setPromos((promoRes.data.promos ?? []) as Promo[]);
        setSources(promoRes.data.sources ?? []);
        setPromosError(false);
      } catch {
        setPromos([]);
        setSources([]);
        setPromosError(true);
      }
      const savedNote = data.partial && data.searchedRadiusMeters
        ? `${label} · ${t('osmReducedRadius').replace('{km}', (data.searchedRadiusMeters / 1000).toFixed(1))}`
        : label;
      await cacheSet(CACHE_KEYS.lastNear, { branches: list, note: savedNote, lat, lng });
    } catch {
      const cached = await cacheGet<{ branches: Branch[]; note: string; lat?: number; lng?: number }>(CACHE_KEYS.lastNear);
      const cachedLat = cached?.data?.lat;
      const cachedLng = cached?.data?.lng;
      const latDelta = ((cachedLat ?? 999) - lat) * 111_000;
      const lngDelta = ((cachedLng ?? 999) - lng) * 111_000 * Math.cos((lat * Math.PI) / 180);
      const sameArea = Math.hypot(latDelta, lngDelta) <= 1000;
      if (sameArea && cached?.data?.branches?.length) {
        setBranches(cached.data.branches);
        setPromosError(true);
        setPromos([]);
        setSources([]);
        setNote(t('offlineLastSearch'));
        setFromCache(true);
        setError('');
      } else {
        setError(t('nearError'));
        setBranches([]);
        setPromos([]);
        setSources([]);
        setPromosError(false);
        setNote('');
        setFromCache(false);
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
      () => {
        setLoading(false);
        setBranches([]);
        setPromos([]);
        setSources([]);
        setNote('');
        setFromCache(false);
        setError(t('locationPermissionError'));
      },
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

      {(promos.length > 0 || sources.length > 0 || promosError) && (
        <section className="nearby-promos">
          <div className="nearby-promos-head">
            <div>
              <h2>{t('nearbyPromosTitle')}</h2>
              <p className="meta">{t('nearbyPromosSourceNote')}</p>
            </div>
            <Link className="btn ghost btn-sm" to="/promos">{t('viewAllPromos')}</Link>
          </div>
          {promosError && <p className="error">{t('nearbyPromosError')}</p>}
          {!promosError && promos.length === 0 && <p className="muted">{t('nearbyPromosEmpty')}</p>}
          {promos.length > 0 && (
            <ul className="branch-list nearby-promo-list">
              {promos.map((promo) => (
                <li key={promo._id} className="promo-card nearby-promo-card">
                  <p className="label">{promo.chainName || 'Empresa'}</p>
                  <h3><Link to={`/promos/${promo.slug || promo._id}`}>{promo.nombre || promo.title}</Link></h3>
                  {(promo.descripcion || promo.subtitle) && <p>{promo.descripcion || promo.subtitle}</p>}
                  {promo.ubicacionesCercanas?.length ? (
                    <p className="meta">{t('nearbyBranchesLabel')} {promo.ubicacionesCercanas.map((branch) => `${branch.nombre} (${(branch.distanceMeters / 1000).toFixed(1)} km)`).join(', ')}. {t('branchPromoDisclaimer')}</p>
                  ) : null}
                  <div className="nearby-promo-actions">
                    <Link className="btn primary btn-sm" to={`/promos/${promo.slug || promo._id}`}>{t('seeOfferDetails')}</Link>
                    {promo.url_fuente && <a href={promo.url_fuente} target="_blank" rel="noreferrer">{t('officialSource')} ↗</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {sources.length > 0 && <details>
            <summary>{t('promoSourcesStatus')}</summary>
            <ul>{sources.map((source) => <li key={source.empresa}>{source.empresa}: {source.ok ? `${source.count} promociones` : source.reason || 'sin lectura'}</li>)}</ul>
          </details>}
        </section>
      )}

      {branches.length > 0 && <p className="meta">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. {t('osmCoverageNote')}</p>}

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
              {b.osmUrl && <a className="meta" href={b.osmUrl} target="_blank" rel="noreferrer">Ver en OpenStreetMap ↗</a>}
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
