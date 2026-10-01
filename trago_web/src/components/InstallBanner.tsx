import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import {
  clearDeferredInstall,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/installPrompt';
import './InstallBanner.css';

const DISMISS_KEY = 'trago_install_dismissed_v8';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 5;

type Kind = 'ios' | 'windows' | 'android' | 'desktop-chrome' | 'safari-mac' | 'other';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function detectKind(): Kind {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows|win64|win32|wow64/i.test(ua)) return 'windows';

  const safari =
    /safari/i.test(ua) && !/chrome|crios|fxios|edg|opr|android/i.test(ua);
  if (safari && /macintosh|mac os x/i.test(ua)) return 'safari-mac';

  if (/chrome|edg|chromium|opr/i.test(ua)) return 'desktop-chrome';
  return 'other';
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (Number.isNaN(t)) return true;
    return Date.now() - t < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function ShareIcon() {
  return (
    <svg className="install-share-ico" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3.2 7.8 7.4h2.7v6.4h2.9V7.4h2.8L12 3.2ZM5.2 14.8v4.2c0 .9.7 1.6 1.6 1.6h10.4c.9 0 1.6-.7 1.6-1.6v-4.2h-2.2v3.8H7.4v-3.8H5.2Z"
      />
    </svg>
  );
}

export default function InstallBanner() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const kind = typeof navigator !== 'undefined' ? detectKind() : 'other';

  useEffect(() => {
    const unsub = subscribeInstallPrompt((ev) => {
      setDeferred(ev);
      // En Windows/Android/Chrome: solo mostramos cuando YA se puede instalar
      if (
        ev &&
        !isStandalone() &&
        !wasDismissedRecently() &&
        (kind === 'windows' || kind === 'android' || kind === 'desktop-chrome')
      ) {
        setVisible(true);
      }
    });

    const onShow = () => {
      if (isStandalone()) return;
      setVisible(true);
      if (kind === 'ios') setIosOpen(true);
    };
    window.addEventListener('trago-show-install', onShow);

    // iOS / Safari Mac: sí mostramos guía (Apple no da API de instalar)
    const timer = window.setTimeout(() => {
      if (isStandalone() || wasDismissedRecently()) return;
      if (kind === 'ios' || kind === 'safari-mac') {
        setVisible(true);
        if (kind === 'ios') setIosOpen(true);
      }
      // Chromium: si aún no hay evento, igual mostramos tras espera larga
      // pero el CTA principal solo instala si hay deferred
      if (
        (kind === 'windows' || kind === 'android' || kind === 'desktop-chrome') &&
        !deferred
      ) {
        // si ya llegó deferred, subscribe lo mostró
        setVisible(true);
      }
    }, kind === 'ios' ? 2800 : 5000);

    return () => {
      unsub();
      window.removeEventListener('trago-show-install', onShow);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  if (!visible || isStandalone()) return null;

  async function installApp() {
    if (!deferred || busy) return false;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      clearDeferredInstall();
      if (choice.outcome === 'accepted') setVisible(false);
      return choice.outcome === 'accepted';
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setIosOpen(false);
  }

  const canNative = Boolean(deferred);

  // —— iOS: hoja dedicada “Agregar a inicio” ——
  if (kind === 'ios') {
    return (
      <div className="install-sheet install-sheet-ios" role="dialog" aria-label={t('installTitleIos')}>
        <div className="install-sheet-card">
          <div className="install-sheet-top">
            <img
              className="install-logo"
              src="/icon-192-v2.png"
              width={48}
              height={48}
              alt="TraGo"
            />
            <div className="install-copy">
              <strong>{t('installTitleIos')}</strong>
              <p>{t('installTipIos')}</p>
            </div>
          </div>

          {!iosOpen ? (
            <div className="install-actions">
              <button
                type="button"
                className="btn primary install-cta"
                onClick={() => setIosOpen(true)}
              >
                {t('installAddHome')}
              </button>
              <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
                {t('notNow')}
              </button>
            </div>
          ) : (
            <div className="install-ios-panel">
              <p className="install-ios-note">{t('installIosNeedSafari')}</p>
              <div className="install-ios-share" aria-hidden>
                <ShareIcon />
                <span>{t('installStepShare')}</span>
              </div>
              <ol className="install-steps">
                <li>{t('installStepIos1')}</li>
                <li>{t('installStepIos2')}</li>
                <li>{t('installStepIos3')}</li>
              </ol>
              <div className="install-actions">
                <button
                  type="button"
                  className="btn primary install-cta"
                  onClick={dismiss}
                >
                  {t('understood')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // —— Safari Mac ——
  if (kind === 'safari-mac') {
    return (
      <div className="install-sheet is-expanded" role="dialog" aria-label={t('installTitleSafari')}>
        <div className="install-sheet-card">
          <div className="install-sheet-top">
            <img className="install-logo" src="/icon-192-v2.png" width={48} height={48} alt="TraGo" />
            <div className="install-copy">
              <strong>{t('installTitleSafari')}</strong>
              <p>{t('installTipSafari')}</p>
            </div>
          </div>
          <ol className="install-steps">
            <li>{t('installStepSafari1')}</li>
            <li>{t('installStepSafari2')}</li>
            <li>{t('installStepSafari3')}</li>
          </ol>
          <div className="install-actions">
            <button type="button" className="btn primary install-cta" onClick={dismiss}>
              {t('understood')}
            </button>
            <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
              {t('notNow')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // —— Windows / Android / Chrome: instalar nativo ——
  const title =
    kind === 'windows' ? t('installTitleWindows') : t('installTitle');

  return (
    <div className="install-sheet" role="dialog" aria-label={title}>
      <div className="install-sheet-card">
        <div className="install-sheet-top">
          <img
            className="install-logo"
            src="/icon-192-v2.png"
            width={48}
            height={48}
            alt="TraGo"
          />
          <div className="install-copy">
            <strong>{title}</strong>
            <p>
              {canNative
                ? kind === 'windows'
                  ? t('installTipWindowsReady')
                  : t('installTipReady')
                : t('installWaitingBrowser')}
            </p>
          </div>
        </div>

        <div className="install-actions">
          <button
            type="button"
            className="btn primary install-cta"
            disabled={!canNative || busy}
            onClick={() => void installApp()}
          >
            {busy
              ? t('loading')
              : canNative
                ? t('installNow')
                : t('installPreparing')}
          </button>
          <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
            {t('notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
