import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../lib/i18n';
import { resolveMediaUrl } from '../lib/mediaUrl';
import './SponsoredSlot.css';

export type AdSlot = 'home_rail' | 'explorar_mid' | 'cerca_top';

type ServedAd = {
  _id: string;
  titulo?: string;
  copy?: string;
  imagen_url?: string;
  url_destino?: string;
  chainName?: string;
  label?: string;
  alcohol?: boolean;
};

type Props = {
  slot: AdSlot;
  zona?: string;
  className?: string;
};

export default function SponsoredSlot({
  slot,
  zona = 'gdl',
  className = '',
}: Props) {
  const { t } = useI18n();
  const [ad, setAd] = useState<ServedAd | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    tracked.current = false;
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

  const img = resolveMediaUrl(ad.imagen_url);
  const href = ad.url_destino || undefined;

  function onClick() {
    if (!ad?._id) return;
    void api
      .post(`/api/anuncios/${ad._id}/evento`, { tipo: 'click' })
      .catch(() => {});
  }

  const inner = (
    <>
      <span className="sponsored-label">{t('adLabel')}</span>
      {img ? (
        <span className="sponsored-media">
          <img src={img} alt="" loading="lazy" decoding="async" />
        </span>
      ) : null}
      <span className="sponsored-copy">
        <span className="sponsored-title">{ad.titulo}</span>
        {ad.copy ? <span className="sponsored-hint">{ad.copy}</span> : null}
        {ad.chainName ? (
          <span className="sponsored-chain">{ad.chainName}</span>
        ) : null}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        className={`sponsored-slot ${className}`.trim()}
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
    <aside
      className={`sponsored-slot ${className}`.trim()}
      data-slot={slot}
      aria-label={t('adLabel')}
    >
      {inner}
    </aside>
  );
}
