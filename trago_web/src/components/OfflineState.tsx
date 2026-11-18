import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import './OfflineState.css';

type Props = {
  title?: string;
  body?: string;
  cacheAge?: string;
  showFavorites?: boolean;
  showNear?: boolean;
  className?: string;
};

/** Empty / status offline unificado — no inventa datos. */
export default function OfflineState({
  title,
  body,
  cacheAge,
  showFavorites = true,
  showNear = true,
  className = '',
}: Props) {
  const { t } = useI18n();
  return (
    <div className={`offline-state ${className}`.trim()} role="status">
      <p className="offline-state-kicker">{t('offlineBannerTitle')}</p>
      <h3 className="offline-state-title">{title || t('offlineStateTitle')}</h3>
      <p className="offline-state-body">{body || t('offlineStateBody')}</p>
      {cacheAge ? <p className="offline-state-age">{cacheAge}</p> : null}
      <div className="offline-state-actions">
        {showFavorites ? (
          <Link className="btn ghost" to="/favoritos" viewTransition>
            {t('goFavorites')}
          </Link>
        ) : null}
        {showNear ? (
          <Link className="btn ghost" to="/cerca" viewTransition>
            {t('openNear')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
