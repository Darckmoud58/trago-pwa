import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../lib/i18n';
import './PwaUpdater.css';

let updateTimer = 0;

/** El service worker nuevo espera aquí. No toma la página hasta que se confirma. */
export default function PwaUpdater() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration || updateTimer) return;
      updateTimer = window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (offlineReady) setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh) return null;

  return (
    <div className="pwa-update" role="alert">
      <span>{t('updateReady')}</span>
      <div className="pwa-update-actions">
        <button type="button" className="btn ghost btn-sm" onClick={() => setNeedRefresh(false)}>
          {t('updateLater')}
        </button>
        <button
          type="button"
          className="btn primary btn-sm"
          onClick={() => void updateServiceWorker(true)}
        >
          {t('updateNow')}
        </button>
      </div>
    </div>
  );
}
