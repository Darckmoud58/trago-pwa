import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { ICON_192 } from '../lib/iconVersion';
import {
  clearDeferredInstall,
  getDeferredInstall,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/installPrompt';
import { trackGps } from '../lib/metrics';
import { isStandalonePwa } from '../lib/pwa';
import './LocationSplash.css';

const PAGELOAD_DONE = 'trago:pageload-done';
const PAGELOAD_FALLBACK_MS = 4500;
const DISMISS_KEY = 'trago_loc_splash_v2';

/**
 * Primer splash útil: pedir GPS para Cerca.
 * La fecha de nacimiento queda en el registro (servidor filtra el catálogo).
 */
export default function LocationSplash() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [bootReady, setBootReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== 'undefined' ? getDeferredInstall() : null)
  );
  const [installBusy, setInstallBusy] = useState(false);
  const [installHint, setInstallHint] = useState('');
  const installed = typeof window !== 'undefined' && isStandalonePwa();
  const ios =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setBootReady(true);
    };
    if (
      (window as Window & { __tragoPageloadDone?: boolean }).__tragoPageloadDone
    ) {
      markReady();
      return;
    }
    window.addEventListener(PAGELOAD_DONE, markReady);
    const fallback = window.setTimeout(markReady, PAGELOAD_FALLBACK_MS);
    return () => {
      cancelled = true;
      window.removeEventListener(PAGELOAD_DONE, markReady);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => subscribeInstallPrompt(setDeferred), []);

  useEffect(() => {
    if (!bootReady) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [bootReady]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  async function installApp() {
    if (installBusy || installed) return;
    setInstallBusy(true);
    setInstallHint('');
    try {
      const ev = deferred || getDeferredInstall();
      if (ev) {
        await ev.prompt();
        const choice = await ev.userChoice;
        clearDeferredInstall();
        setDeferred(null);
        if (choice.outcome === 'accepted') setInstallHint(t('splashInstallDone'));
        return;
      }
      if (ios && typeof navigator.share === 'function') {
        await navigator.share({
          title: 'TraGo',
          text: t('installTitleIos'),
          url: `${window.location.origin}/`,
        });
        return;
      }
      setInstallHint(ios ? t('splashInstallIos') : t('splashInstallHint'));
    } catch {
      setInstallHint(ios ? t('splashInstallIos') : t('splashInstallHint'));
    } finally {
      setInstallBusy(false);
    }
  }

  function enableLocation() {
    if (busy) return;
    setBusy(true);
    setError('');
    if (!navigator.geolocation) {
      setError(t('noGeo'));
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void trackGps(true, pos.coords.latitude, pos.coords.longitude);
        dismiss();
        setBusy(false);
        navigate('/cerca', { replace: false });
      },
      () => {
        void trackGps(false);
        setError(t('locationPermissionError'));
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }

  if (!bootReady || !open) return null;

  return (
    <div
      className="loc-splash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-splash-copy"
    >
      <div className="loc-splash-panel">
        <img
          className="loc-splash-mascot"
          src={ICON_192}
          alt="TraGo"
          width={96}
          height={96}
          decoding="async"
        />
        <p id="loc-splash-copy" className="loc-splash-copy">
          {t('locSplashBody')}
        </p>
        <div className="loc-splash-actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={enableLocation}
          >
            {busy ? t('locSplashBusy') : t('locSplashEnable')}
          </button>
          {!installed ? (
            <button
              type="button"
              className="btn ghost"
              disabled={installBusy}
              onClick={() => void installApp()}
            >
              {installBusy ? t('splashInstallBusy') : t('splashInstall')}
            </button>
          ) : null}
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={dismiss}
          >
            {t('locSplashLater')}
          </button>
        </div>
        {installHint ? (
          <p className="loc-splash-hint" role="status">
            {installHint}
          </p>
        ) : null}
        {error ? (
          <p className="error loc-splash-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
