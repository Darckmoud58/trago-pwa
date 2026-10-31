import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import PromoMediaImg from '../components/PromoMediaImg';
import PromoPrice from '../components/PromoPrice';
import SponsoredSlot from '../components/SponsoredSlot';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  CACHE_KEYS,
  cacheGet,
  cacheSet,
  filterActivePromos,
} from '../lib/offlineCache';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import type { Promo } from '../types';
import './Promos.css';

type FilterId = 'todas' | 'destacadas' | 'cumple' | 'comida' | 'cafe';

const PUBLIC_FILTERS: FilterId[] = ['todas', 'destacadas', 'comida', 'cafe'];

function parseFilter(raw: string | null, allowBday: boolean): FilterId {
  if (raw === 'cumple' && allowBday) return 'cumple';
  if (raw && (PUBLIC_FILTERS as string[]).includes(raw)) return raw as FilterId;
  return 'todas';
}

function kindOf(p: Promo) {
  return (p.kind || '').toLowerCase();
}

function matchesKind(p: Promo, needles: string[]) {
  const k = kindOf(p);
  const hay = [k, p.nombre, p.title, p.descripcion, p.subtitle, p.chainName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needles.some((n) => k.includes(n) || hay.includes(n));
}

function daysLeft(iso?: string) {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function Promos() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { token, birthdayToday, firstName } = useAuthUser();
  const allowBday = birthdayToday;
  const [searchParams, setSearchParams] = useSearchParams();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [emptyOfficial, setEmptyOfficial] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>(() =>
    parseFilter(searchParams.get('f'), false)
  );
  const [bdayLockedNote, setBdayLockedNote] = useState(false);

  useEffect(() => {
    const raw = searchParams.get('f');
    if (raw === 'cumple' && !allowBday) {
      setBdayLockedNote(true);
      setFilter('todas');
      setSearchParams({}, { replace: true });
      return;
    }
    setBdayLockedNote(false);
    setFilter(parseFilter(raw, allowBday));
  }, [searchParams, allowBday, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/promociones');
        if (cancelled) return;
        const list = filterActivePromos((res.data.promos ?? []) as Promo[]);
        await cacheSet(CACHE_KEYS.promos, list);
        setPromos(list);
        setFromCache(false);
        setError('');
        setEmptyOfficial(list.length === 0);
      } catch {
        const cached = await cacheGet<Promo[]>(CACHE_KEYS.promos);
        if (cancelled) return;
        if (cached?.data?.length) {
          setPromos(filterActivePromos(cached.data));
          setFromCache(true);
          setError('');
          setEmptyOfficial(false);
        } else {
          setError(t('promosLoadError'));
          setEmptyOfficial(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function applyFilter(next: FilterId) {
    if (next === 'cumple' && !allowBday) {
      setBdayLockedNote(true);
      if (!token) {
        navigate('/entrar', { state: { from: '/promos?f=cumple', reason: 'account' } });
      }
      return;
    }
    setFilter(next);
    setBdayLockedNote(false);
    if (next === 'todas') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ f: next }, { replace: true });
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promos.filter((p) => {
      if (filter === 'destacadas' && !(p.featured || p.destacada)) return false;
      if (filter === 'cumple') {
        if (!allowBday) return false;
        if (!(p.cumpleanos || p.isBirthday)) return false;
      }
      if (
        filter === 'comida' &&
        !matchesKind(p, [
          'comida',
          '2x1',
          'combo',
          'pasta',
          'birria',
          'arrachera',
        ])
      )
        return false;
      if (
        filter === 'cafe' &&
        !matchesKind(p, ['cafe', 'café', 'starbucks', 'bebida'])
      )
        return false;
      if (!q) return true;
      const hay = [p.nombre, p.title, p.descripcion, p.subtitle, p.chainName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [promos, filter, query, allowBday]);

  const filters: { id: FilterId; label: string }[] = [
    { id: 'todas', label: t('filterAll') },
    { id: 'destacadas', label: t('filterFeatured') },
    { id: 'comida', label: t('filterFood') },
    { id: 'cafe', label: t('filterCafe') },
    ...(allowBday
      ? [{ id: 'cumple' as const, label: t('filterBday') }]
      : []),
  ];

  const countLabel =
    visible.length === 1
      ? t('promoCount', { n: visible.length })
      : t('promoCountPlural', { n: visible.length });

  const hero =
    allowBday && filter === 'cumple'
      ? {
          kicker: t('catBdayToday'),
          title: t('bdayTitle').replace(
            '{name}',
            firstName ? `, ${firstName}` : ''
          ),
          lead: t('bdayBody'),
          bday: true,
        }
      : filter === 'destacadas'
        ? {
            kicker: t('navExplore'),
            title: t('featured'),
            lead: t('exploreHeroFeatured'),
            bday: false,
          }
        : filter === 'comida'
          ? {
              kicker: t('navExplore'),
              title: t('filterFood'),
              lead: t('exploreHeroFood'),
              bday: false,
            }
          : filter === 'cafe'
            ? {
                kicker: t('navExplore'),
                title: t('filterCafe'),
                lead: t('exploreHeroCafe'),
                bday: false,
              }
            : {
                kicker: t('navExplore'),
                title: t('exploreHeroTitle'),
                lead: t('exploreHeroLead'),
                bday: false,
              };

  return (
    <section className="promos-page">
      <header className={`promos-hero-stage${hero.bday ? ' is-bday' : ''}`}>
        <div className="promos-hero-visual" aria-hidden />
        <div className="promos-hero-glow" aria-hidden />
        <div className="promos-hero-copy">
          <p className="ui-kicker">{hero.kicker}</p>
          <h1>{hero.title}</h1>
          <p className="promos-hero-lead">{hero.lead}</p>
        </div>
      </header>

      <div className="promos-toolbar" data-reveal>
        <label className="promos-search">
          <span className="sr-only">{t('search')}</span>
          <span className="promos-search-ico" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm7.2 11.1 3.5 3.5-1.4 1.4-3.5-3.5 1.4-1.4Z"
              />
            </svg>
          </span>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
        </label>
        <div
          className="promos-filters scroll-rail"
          role="tablist"
          aria-label={t('filtersAria')}
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`filter-chip${filter === f.id ? ' is-on' : ''}${f.id === 'cumple' ? ' is-bday-chip' : ''}`}
              onClick={() => applyFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="promos-count meta" aria-live="polite">
          {loading
            ? t('loading')
            : `${countLabel}${fromCache ? t('localCache') : ''}`}
        </p>
      </div>

      {bdayLockedNote && !allowBday && (
        <p className="promos-note" role="status">
          {t('bdayLockedFilter')}{' '}
          {!token ? (
            <Link to="/entrar" state={{ from: '/promos', reason: 'account' }}>
              {t('quickLogin')}
            </Link>
          ) : null}
        </p>
      )}

      <SponsoredSlot slot="explorar_mid" className="promos-sponsored" />

      {error && <p className="error">{error}</p>}

      <div className="promo-grid promos-grid stagger" data-reveal data-reveal-delay="1">
        {visible.map((p) => {
          const title = p.nombre || p.title || t('promoFallback');
          const desc = p.descripcion || p.subtitle;
          const end = p.termina_en || p.endsAt;
          const left = daysLeft(end);
          const img = resolveMediaUrl(p.imagen || p.imageUrl);

          return (
            <article key={p._id} className="promo-card promo-rich">
              <Link
                to={`/promos/${p.slug || p._id}`}
                className={`promo-cover${img ? '' : ' promo-cover-fallback'}`}
                aria-label={title}
                viewTransition
              >
                <PromoMediaImg
                  src={img}
                  fallback={
                    <span>{(p.chainName || 'TG').slice(0, 2).toUpperCase()}</span>
                  }
                />
              </Link>

              <div className="promo-body">
                <div className="promo-tags">
                  <span className="tag">{p.chainName || t('chainFallback')}</span>
                  {(p.featured || p.destacada) && (
                    <span className="tag accent">{t('featuredTag')}</span>
                  )}
                  {(p.cumpleanos || p.isBirthday) && allowBday && (
                    <span className="tag accent">{t('bdayTag')}</span>
                  )}
                </div>

                <h3>
                  <Link
                    to={`/promos/${p.slug || p._id}`}
                    className="promo-title-link"
                    viewTransition
                  >
                    {title}
                  </Link>
                </h3>
                <PromoPrice promo={p} />
                {desc && <p className="promo-desc">{desc}</p>}

                <div className="promo-meta-row">
                  {end && (
                    <span className="meta">
                      {t('untilDate')}{' '}
                      {new Date(end).toLocaleDateString(
                        locale === 'en' ? 'en-US' : 'es-MX'
                      )}
                      {left != null && left >= 0 ? ` · ${left}d` : ''}
                      {left != null && left < 0 ? t('expired') : ''}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state promos-empty">
          <p>{emptyOfficial ? t('promosEmptyOfficial') : t('promosEmpty')}</p>
          {emptyOfficial ? (
            <Link className="btn primary" to="/cerca" viewTransition>
              {t('openNear')}
            </Link>
          ) : (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                applyFilter('todas');
                setQuery('');
              }}
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
