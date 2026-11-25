import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import './SponsoredSlot.css';

/** iOS Safari no reproduce WebM; en ads-beta suele existir el .mp4 hermano. */
function preferPlayableVideo(url: string): string {
  if (!url) return '';
  if (/\.webm(\?|#|$)/i.test(url)) {
    return url.replace(/\.webm(\?|#|$)/i, '.mp4$1');
  }
  return url;
}

export type AdSlot =
  | 'home_rail'
  | 'explorar_mid'
  | 'cerca_top'
  | 'side_left'
  | 'side_right'
  | 'inicio_side_left'
  | 'inicio_side_right'
  | 'explorar_side_left'
  | 'explorar_side_right';

type ServedAd = {
  _id: string;
  titulo?: string;
  copy?: string;
  imagen_url?: string;
  video_url?: string;
  url_destino?: string;
  chainName?: string;
  label?: string;
  alcohol?: boolean;
};

type Props = {
  slot: AdSlot;
  zona?: string;
  className?: string;
  /** Vertical creativo para rieles laterales (desktop). */
  variant?: 'default' | 'side';
  /** Anuncio ya elegido. Si viene, no se vuelve a pedir el slot. */
  fixedAd?: ServedAd | null;
};

export function useSlotAds(slot: AdSlot, zona = 'gdl') {
  const [ads, setAds] = useState<ServedAd[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/anuncios/serving', {
          params: { slot, zona },
        });
        if (!cancelled) setAds((res.data.anuncios || []) as ServedAd[]);
      } catch {
        if (!cancelled) setAds([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slot, zona]);

  return ads;
}

/**
 * Cada `every` fichas, el siguiente anuncio del pool.
 * `maxInserts` evita montar decenas de creativos (iOS Safari OOM en Explorar).
 */
export function weaveAdAt<T>(
  ads: T[],
  index: number,
  every = 6,
  maxInserts = 2
): T | null {
  if (!ads.length || every < 1 || maxInserts < 1) return null;
  if ((index + 1) % every !== 0) return null;
  const turn = Math.floor((index + 1) / every) - 1;
  if (turn < 0 || turn >= maxInserts) return null;
  return ads[((turn % ads.length) + ads.length) % ads.length] ?? null;
}

/** Cuántos anuncios intercalaría un feed de `itemCount` fichas. */
export function weaveAdCount(itemCount: number, every = 6, maxInserts = 2): number {
  if (every < 1 || itemCount < every || maxInserts < 1) return 0;
  return Math.min(maxInserts, Math.floor(itemCount / every));
}

type AdLike = { _id?: string; titulo?: string; imagen_url?: string; video_url?: string };

/**
 * Elige el anuncio del weave evitando repetir el mismo id o creativo
 * que el ítem anterior (p. ej. promo con la misma imagen).
 */
export function weaveAdAtSafe<T extends AdLike>(
  ads: T[],
  index: number,
  every = 6,
  previous?: { title?: string; image?: string; video?: string } | null,
  maxInserts = 2
): T | null {
  const raw = weaveAdAt(ads, index, every, maxInserts);
  if (!raw) return null;
  if (!previous) return raw;
  const prevTitle = String(previous.title || '')
    .trim()
    .toLowerCase();
  const adTitle = String(raw.titulo || '')
    .trim()
    .toLowerCase();
  if (prevTitle && adTitle && prevTitle === adTitle) return null;
  const prevMedia = String(previous.image || previous.video || '').trim();
  const adMedia = String(raw.imagen_url || raw.video_url || '').trim();
  if (prevMedia && adMedia && prevMedia === adMedia) return null;
  return raw;
}

function pickVisitAd(list: ServedAd[], slot: string) {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const key = `trago-ad-turn:${slot}`;
  let turn = 0;
  try {
    turn = Number(sessionStorage.getItem(key) || '0') || 0;
  } catch {
    turn = 0;
  }
  const ad = list[Math.abs(turn) % list.length];
  try {
    sessionStorage.setItem(key, String(turn + 1));
  } catch {
    /* sesión privada */
  }
  return ad;
}

function openAdUrl(href: string) {
  try {
    const win = window.open(href, '_blank', 'noopener,noreferrer');
    if (win) return;
  } catch {
    /* popup / webview */
  }
  try {
    const abs = new URL(href, window.location.href);
    // No reemplazar Explorar/Home si el destino es mismo origen y el popup falló.
    if (abs.origin !== window.location.origin) {
      window.location.assign(abs.href);
    }
  } catch {
    /* URL inválida */
  }
}

export default function SponsoredSlot({
  slot,
  zona = 'gdl',
  className = '',
  variant = 'default',
  fixedAd,
}: Props) {
  const { t } = useI18n();
  const [ad, setAd] = useState<ServedAd | null>(fixedAd ?? null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const tracked = useRef(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const locked = fixedAd !== undefined;

  useEffect(() => {
    if (!locked) return;
    tracked.current = false;
    setVideoFailed(false);
    setImgFailed(false);
    setAd(fixedAd ?? null);
  }, [locked, fixedAd]);

  useEffect(() => {
    if (locked) return;
    let cancelled = false;
    tracked.current = false;
    setVideoFailed(false);
    setImgFailed(false);
    async function load() {
      try {
        const res = await api.get('/api/anuncios/serving', {
          params: { slot, zona },
        });
        const list = (res.data.anuncios || []) as ServedAd[];
        if (!cancelled) setAd(pickVisitAd(list, slot));
      } catch {
        if (!cancelled) setAd(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slot, zona, locked]);

  useEffect(() => {
    if (!ad?._id || tracked.current) return;
    tracked.current = true;
    void api
      .post(`/api/anuncios/${ad._id}/evento`, { tipo: 'impression' })
      .catch(() => {});
  }, [ad]);

  const isSide = variant === 'side';
  const isFeature = slot === 'home_rail' || isSide;
  /** Mid-feed (Explorar/Cerca): solo imagen. Decenas de <video autoPlay> tumba iOS Safari. */
  const allowVideo = isFeature;

  useEffect(() => {
    if (!allowVideo || !ad) {
      setInView(false);
      return;
    }
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        setInView(hit);
      },
      { root: null, threshold: 0.2, rootMargin: '40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [allowVideo, ad?._id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      const play = v.play();
      if (play && typeof play.catch === 'function') {
        play.catch(() => {
          /* autoplay bloqueado */
        });
      }
    } else {
      v.pause();
    }
  }, [inView, ad?._id, videoFailed]);

  if (!ad) return null;

  const video = allowVideo && !videoFailed ? resolveMediaUrl(ad.video_url) : '';
  const img = !imgFailed ? resolveMediaUrl(ad.imagen_url) : '';
  const href = ad.url_destino || undefined;
  const isDemoAd =
    /^beta\s*·/i.test(String(ad.titulo || '')) ||
    /trago\s*beta/i.test(String(ad.chainName || ''));
  const adBadge = isDemoAd
    ? `${t('adLabel')} · ${t('adDemoLabel')}`
    : t('adLabel');

  function trackClick() {
    if (!ad?._id) return;
    void api
      .post(`/api/anuncios/${ad._id}/evento`, { tipo: 'click' })
      .catch(() => {});
  }

  function onCtaClick(e: MouseEvent<HTMLAnchorElement>) {
    trackClick();
    if (!href) return;
    e.preventDefault();
    openAdUrl(href);
  }

  const mediaInner = video ? (
    <video
      ref={videoRef}
      src={preferPlayableVideo(video)}
      poster={img || undefined}
      muted
      playsInline
      loop
      preload={inView ? 'metadata' : 'none'}
      aria-hidden
      onError={() => setVideoFailed(true)}
    />
  ) : img ? (
    <img
      src={img}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setImgFailed(true)}
    />
  ) : (
    <span className="sponsored-fallback-mark" aria-hidden>
      TraGo
    </span>
  );

  /** Solo el CTA abre externo; el creativo no debe robar taps del feed/nav en móvil. */
  const cta = href ? (
    <a
      className="sponsored-cta"
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={onCtaClick}
    >
      {t('adOpen')}
    </a>
  ) : null;

  const copy = (
    <span className="sponsored-copy">
      <span className="sponsored-title">{ad.titulo}</span>
      {ad.copy ? <span className="sponsored-hint">{ad.copy}</span> : null}
      {ad.chainName ? (
        <span className="sponsored-chain">{ad.chainName}</span>
      ) : null}
      {cta}
    </span>
  );

  const inner = isFeature ? (
    <>
      <span className="sponsored-stage">
        <span
          className={`sponsored-media${video ? ' sponsored-media--video' : ''}${!video && !img ? ' sponsored-media--fallback' : ''}`}
        >
          {mediaInner}
        </span>
        <span className="sponsored-glow" aria-hidden />
        <span className="sponsored-shade" aria-hidden />
        <span className="sponsored-label">{adBadge}</span>
        {copy}
      </span>
    </>
  ) : (
    <>
      <span className="sponsored-label">{adBadge}</span>
      <span
        className={`sponsored-media${video ? ' sponsored-media--video' : ''}${!video && !img ? ' sponsored-media--fallback' : ''}`}
      >
        {mediaInner}
      </span>
      {copy}
    </>
  );

  const cls = [
    'sponsored-slot',
    video ? 'sponsored-slot--video' : '',
    isFeature ? 'sponsored-slot--feature' : 'sponsored-slot--inline',
    isSide ? 'sponsored-slot--side' : '',
    href ? 'sponsored-slot--has-cta' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside
      ref={rootRef}
      className={cls}
      data-slot={slot}
      aria-label={adBadge}
    >
      {inner}
    </aside>
  );
}
