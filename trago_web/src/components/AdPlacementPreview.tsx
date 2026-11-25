import { useState } from 'react';
import { useI18n } from '../lib/i18n';
import './AdPlacementPreview.css';

type Props = {
  window: 'inicio' | 'explorar';
  position: string;
  title: string;
  copy: string;
  image: string;
  video: string;
};

export default function AdPlacementPreview({ window, position, title, copy, image, video }: Props) {
  const { t } = useI18n();
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const side = position.endsWith('_left') ? 'left' : position.endsWith('_right') ? 'right' : '';
  const desktopOnly = Boolean(side && device === 'mobile');
  const pageLabel = t(window === 'inicio' ? 'navHome' : 'navExplore');

  const creative = !desktopOnly && (
    <article className="ad-preview-creative">
      {video ? (
        <video src={video} poster={image || undefined} controls playsInline muted preload="none" />
      ) : image ? (
        <img src={image} alt="" loading="lazy" />
      ) : null}
      <div>
        <span className="ad-preview-label">{t('adLabel')}</span>
        <strong>{title.trim() || t('chainAdTitle')}</strong>
        {copy.trim() && <p>{copy}</p>}
      </div>
    </article>
  );

  return (
    <section className="ad-preview" aria-label={t('adPreviewTitle')}>
      <div className="ad-preview-toolbar">
        <h3>{t('adPreviewTitle')}</h3>
        <div className="ad-preview-switch" role="group" aria-label={t('adPreviewDevice')}>
          <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
            {t('adPreviewMobile')}
          </button>
          <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
            {t('adPreviewDesktop')}
          </button>
        </div>
      </div>
      <div className="ad-preview-screen" data-device={device} key={device}>
        <header><strong>TraGo</strong><span>{pageLabel}</span></header>
        <div className="ad-preview-layout" data-side={side}>
          {side === 'left' && creative}
          <div className="ad-preview-feed">
            <div className="ad-preview-context" aria-hidden="true"><i /><i /></div>
            {!side && creative}
            {desktopOnly && <p className="meta">{t('chainAdDesktopOnly')}</p>}
            <div className="ad-preview-context" aria-hidden="true"><i /><i /></div>
          </div>
          {side === 'right' && creative}
        </div>
        {device === 'mobile' && <div aria-hidden="true" className="ad-preview-home-indicator" />}
      </div>
      {position === 'aleatoria' && <p className="meta">{t('adPreviewRotation')}</p>}
    </section>
  );
}
