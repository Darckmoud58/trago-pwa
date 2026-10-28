import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../lib/i18n';
import './PwaUpdater.css';

let updateTimer = 0;

async function forceApplyWaitingWorker() {
  const reg = await navigator.serviceWorker.getRegistration();
  const waiting = reg?.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/** El service worker nuevo espera aquí. No toma la página hasta que se confirma. */
export default function PwaUpdater() {
  const { t } = useI18n();
  const [updating, setUpdating] = useState(false);
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

  async function applyUpdate() {
    if (updating) return;
    setUpdating(true);
    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', reload, {
      once: true,
    });

    try {
      await forceApplyWaitingWorker();
      await updateServiceWorker(true);
    } catch {
      /* seguimos con el fallback de recarga */
    }

    // Workbox a veces no recarga si controlling.isUpdate es falso.
    window.setTimeout(reload, 700);
  }

  if (!needRefresh) return null;

  return (
    <div className="pwa-update" role="alert">
      <span>{t('updateReady')}</span>
      <div className="pwa-update-actions">
        <button
          type="button"
          className="btn ghost btn-sm"
          disabled={updating}
          onClick={() => setNeedRefresh(false)}
        >
          {t('updateLater')}
        </button>
        <button
          type="button"
          className="btn primary btn-sm"
          disabled={updating}
          onClick={() => void applyUpdate()}
        >
          {updating ? t('loading') : t('updateNow')}
        </button>
      </div>
    </div>
  );
}
