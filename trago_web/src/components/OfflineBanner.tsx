import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { t } = useI18n();
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <div className="offline-banner-copy">
        <strong>{t('offlineBannerTitle')}</strong>
        <span>{t('offlineBannerBodyRich')}</span>
      </div>
      <div className="offline-banner-links">
        <Link to="/favoritos">{t('goFavorites')}</Link>
        <Link to="/cerca">{t('goNearShort')}</Link>
      </div>
    </div>
  );
}
