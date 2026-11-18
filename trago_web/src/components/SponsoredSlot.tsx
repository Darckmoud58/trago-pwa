import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import './SponsoredSlot.css';

export type AdSlot =
  | 'home_rail'
  | 'explorar_mid'
  | 'cerca_top'
  | 'side_left'
  | 'side_right';

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
};

export default function SponsoredSlot({
  slot,
  zona = 'gdl',
  className = '',
  variant = 'default',
}: Props) {
  const { t } = useI18n();
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
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
        if (!cancelled) setAd(list[0] || null);
      } catch {
        if (!cancelled) setAd(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slot, zona]);

  useEffect(() => {
    if (!ad?._id || tracked.current) return;
    tracked.current = true;
    void api
      .post(`/api/anuncios/${ad._id}/evento`, { tipo: 'impression' })
      .catch(() => {});
  }, [ad]);

  if (!ad) return null;

  const video = !videoFailed ? resolveMediaUrl(ad.video_url) : '';
  const img = !imgFailed ? resolveMediaUrl(ad.imagen_url) : '';
  const href = ad.url_destino || undefined;
  const isSide = variant === 'side';
  const isFeature = slot === 'home_rail' || isSide;
  const isDemoAd =
    /^beta\s*·/i.test(String(ad.titulo || '')) ||
    /trago\s*beta/i.test(String(ad.chainName || ''));
  const adBadge = isDemoAd
    ? `${t('adLabel')} · ${t('adDemoLabel')}`
    : t('adLabel');

  function onClick() {
    if (!ad?._id) return;
    void api
      .post(`/api/anuncios/${ad._id}/evento`, { tipo: 'click' })
      .catch(() => {});
  }

  const mediaInner = video ? (
    <video
      src={video}
      poster={img || undefined}
      muted
      playsInline
      autoPlay
      loop
      preload="metadata"
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

  const copy = (
    <span className="sponsored-copy">
      <span className="sponsored-title">{ad.titulo}</span>
      {ad.copy ? <span className="sponsored-hint">{ad.copy}</span> : null}
      {ad.chainName ? (
        <span className="sponsored-chain">{ad.chainName}</span>
      ) : null}
      {href ? <span className="sponsored-cta">{t('adOpen')}</span> : null}
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
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <a
        className={cls}
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClick}
        data-slot={slot}
      >
        {inner}
      </a>
    );
  }

  return (
    <aside className={cls} data-slot={slot} aria-label={adBadge}>
      {inner}
    </aside>
  );
}
