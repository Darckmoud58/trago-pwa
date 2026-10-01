import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { t } = useI18n();
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <strong>{t('offlineBannerTitle')}</strong>
      <span>
        {t('offlineBannerBody')}{' '}
        <Link to="/favoritos">{t('goFavorites')}</Link>
      </span>
    </div>
  );
}
