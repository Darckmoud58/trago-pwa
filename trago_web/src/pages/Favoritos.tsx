import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  isFavoritesSession,
  listFavorites,
  removeFavorite,
  syncFavorites,
  type FavoritePlace,
} from '../lib/favorites';
import { api } from '../api';
import NearMap from '../components/NearMap';
import { CACHE_KEYS, cacheGet, cacheSet, isPromoActive, isRestrictedCachedPromo } from '../lib/offlineCache';
import { googleMapsExactUrl, googleMapsSearchUrl } from '../lib/googleMaps';
import { useAuthUser } from '../hooks/useAuthUser';
import type { Branch, Promo } from '../types';
import OfflineState from '../components/OfflineState';
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

function FavoriteDetails({ place, online }: { place: FavoritePlace; online: boolean }) {
  const { t, locale } = useI18n();
  const { birthdayToday } = useAuthUser();
  const [detail, setDetail] = useState<{ sucursal?: Branch; promos: Promo[] } | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (place.type !== 'ubicacion') return;
    const controller = new AbortController();
    const branchId = /^[a-f0-9]{24}$/i.test(place.id);
    const key = `favorito_sucursal_${place.id}`;
    async function load() {
      if (online && branchId) {
        try {
          const { data } = await api.get<{ sucursal?: Branch; promos: Promo[] }>('/api/promociones', {
            params: { sucursal: place.id },
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (String(data.sucursal?._id) !== place.id || !Array.isArray(data.promos)) {
            throw new Error('Missing branch response');
          }
          setFromCache(false);
          setDetail(data);
          await cacheSet(key, {
            sucursal: data.sucursal,
            promos: data.promos.filter((promo) => !isRestrictedCachedPromo(promo) && !promo.cumpleanos && !promo.isBirthday),
          });
          return;
        } catch (err) {
          if (controller.signal.aborted) return;
          if ((err as { response?: { status?: number } }).response?.status === 404) {
            setFromCache(false);
            setDetail({ promos: [] });
            await cacheSet(key, { promos: [] });
            return;
          }
        }
      }
      const [cached, near] = await Promise.all([
        cacheGet<{ sucursal?: Branch; promos: Promo[] }>(key),
        cacheGet<{ branches?: Branch[]; promos?: Promo[] }>(CACHE_KEYS.lastNear),
      ]);
      if (controller.signal.aborted) return;
      setFromCache(Boolean(cached || near));
      setDetail(cached?.data ?? {
        sucursal: near?.data.branches?.find((branch) => String(branch._id) === place.id),
        promos: (near?.data.promos ?? []).filter((promo) =>
          !isRestrictedCachedPromo(promo) && promo.ubicacionesCercanas?.some(
            (branch) => String(branch._id) === place.id && branch.participacionConfirmada === true
          )
        ),
      });
    }
    void load();
    return () => controller.abort();
  }, [place.id, place.type, online]);

  const lat = detail?.sucursal?.lat ?? place.lat;
  const lng = detail?.sucursal?.lng ?? detail?.sucursal?.long ?? place.lng;
  const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const address = detail?.sucursal?.address ?? place.direccion;
  const hours = detail?.sucursal?.hours ?? place.horario;
  const city = [detail?.sucursal?.colonia ?? place.colonia, detail?.sucursal?.city ?? place.municipio].filter(Boolean).join(', ');
  const mapsPlace = { lat, lng, name: place.nombre, address, city };
  const maps = googleMapsExactUrl(mapsPlace) || googleMapsSearchUrl(mapsPlace);
  const promos = (detail?.promos ?? []).filter((promo) =>
    isPromoActive(promo) &&
    ((online && !fromCache) || !isRestrictedCachedPromo(promo)) &&
    (!(promo.cumpleanos || promo.isBirthday) || (online && !fromCache && birthdayToday))
  );

  return (
    <div className="fav-details">
      {address && <p className="meta">{address}</p>}
      {city && <p className="meta">{city}</p>}
      {hours && <p className="meta">{hours}</p>}
      {hasPin && online && <NearMap places={[{ id: place.id, lat, lng, name: place.nombre, detail: address ?? '' }]} />}
      {hasPin && !online && <p className="meta">{lat.toFixed(5)}, {lng.toFixed(5)}</p>}
      {maps && <a className="btn ghost" href={maps} target="_blank" rel="noreferrer">{t('favDirections')}</a>}
      {place.type === 'ubicacion' && (
        <div>
          <h4>{t('favBranchPromos')}</h4>
          {(fromCache || !online) && <p className="meta">{t('favOfflineDetails')}</p>}
          {promos.length ? (
            <ul>
              {promos.map((promo) => {
                const title = promo.nombre || promo.title || t('promoFallback');
                const end = promo.termina_en || promo.endsAt;
                const endLabel = end && Number.isFinite(Date.parse(end))
                  ? new Date(end).toLocaleDateString(locale)
                  : null;
                return (
                  <li key={promo._id}>
                    {online && !fromCache ? (
                      <Link to={`/promos/${promo.slug || promo._id}`}>{title}</Link>
                    ) : title}
                    {endLabel && <p className="meta">{t('untilDate')} {endLabel}</p>}
                  </li>
                );
              })}
            </ul>
          ) : detail ? (
            <p className="meta">{t(online && !fromCache ? 'favNoConfirmedPromos' : 'favNoSavedPromos')}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function Favoritos() {
  const { t } = useI18n();
  const loggedIn = isFavoritesSession();
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<FavoritePlace[]>([]);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  async function refresh() {
    if (!isFavoritesSession()) {
      setItems([]);
      return;
    }
    setItems(await listFavorites());
    if (navigator.onLine) {
      await syncFavorites();
      setItems(await listFavorites());
    }
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
  }, [loggedIn]);

  async function onRemove(id: string, type: FavoritePlace['type']) {
    if (!isFavoritesSession()) return;
    await removeFavorite(id, type);
    await refresh();
  }

  if (!loggedIn) {
    return (
      <section className="favs-page">
        <header className="ui-hero favs-hero">
          <p className="ui-kicker">{t('navFavorites')}</p>
          <h2>{t('myFavorites')}</h2>
        </header>
        <div className="empty-state favs-empty">
          <p>{t('favNeedLogin')}</p>
          <p className="muted">{t('favLoginHint')}</p>
          <Link
            className="btn primary"
            to="/entrar"
            state={{ from: '/favoritos', reason: 'favorite' }}
            viewTransition
          >
            {t('loginSubmit')}
          </Link>
        </div>
      </section>
    );
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
        !online ? (
          <OfflineState
            title={t('myFavorites')}
            body={t('offlineStateBody')}
            showFavorites={false}
          />
        ) : (
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
        )
      ) : (
        <ul className="favs-list stagger" data-reveal>
          {items.map((f) => {
            const mark = f.subtitulo || f.nombre;
            const key = `${f.type}:${f.id}`;
            const expanded = selected === key;
            return (
              <li key={`${f.type}:${f.id}`} className="fav-card">
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
                  <h3>
                    <button type="button" className="fav-detail-toggle" aria-expanded={expanded}
                      onClick={() => setSelected(expanded ? null : key)}>
                      {f.nombre}
                    </button>
                  </h3>
                  {f.subtitulo && <p className="meta">{f.subtitulo}</p>}
                  {!expanded && f.direccion && <p className="meta">{f.direccion}</p>}
                  {!expanded && (f.colonia || f.municipio) && (
                    <p className="meta">
                      {[f.colonia, f.municipio].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {!expanded && f.horario && <p className="meta">{f.horario}</p>}
                </div>
                <button
                  type="button"
                  className="btn ghost fav-remove"
                  onClick={() => void onRemove(f.id, f.type)}
                  aria-label={t('favRemoveAria', { name: f.nombre })}
                >
                  {t('favRemove')}
                </button>
                {expanded && <FavoriteDetails place={f} online={online} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
