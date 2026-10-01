import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import {
  clearDeferredInstall,
  getDeferredInstall,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/installPrompt';
import './InstallBanner.css';

const DISMISS_KEY = 'trago_install_dismissed_v10';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 3;

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

/** Limpia dismiss viejos del bug “Preparando…” para que vuelva a salir. */
function clearLegacyDismiss() {
  try {
    [
      'trago_install_dismissed_v4',
      'trago_install_dismissed_v5',
      'trago_install_dismissed_v6',
      'trago_install_dismissed_v7',
      'trago_install_dismissed_v8',
      'trago_install_dismissed_v9',
    ].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
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
    () => (typeof window !== 'undefined' ? getDeferredInstall() : null)
  );
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const kind = typeof navigator !== 'undefined' ? detectKind() : 'other';

  useEffect(() => {
    clearLegacyDismiss();

    const unsub = subscribeInstallPrompt((ev) => {
      setDeferred(ev);
      if (ev && !isStandalone() && !wasDismissedRecently()) {
        setVisible(true);
      }
    });

    const onShow = () => {
      if (isStandalone()) return;
      setVisible(true);
    };
    window.addEventListener('trago-show-install', onShow);

    // Siempre mostrar (salvo ya instalada / dismiss reciente)
    const timer = window.setTimeout(() => {
      if (!isStandalone() && !wasDismissedRecently()) {
        setVisible(true);
      }
    }, 2200);

    return () => {
      unsub();
      window.removeEventListener('trago-show-install', onShow);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  async function installApp() {
    const ev = deferred || getDeferredInstall();
    if (!ev || busy) return;
    setBusy(true);
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      clearDeferredInstall();
      setDeferred(null);
      if (choice.outcome === 'accepted') setVisible(false);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  const canNative = Boolean(deferred);

  // iOS — agregar a inicio
  if (kind === 'ios') {
    return (
      <div
        className="install-sheet install-sheet-ios is-expanded"
        role="dialog"
        aria-label={t('installTitleIos')}
      >
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
          </div>
          <div className="install-actions">
            <button
              type="button"
              className="btn primary install-cta"
              onClick={dismiss}
            >
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

  if (kind === 'safari-mac') {
    return (
      <div
        className="install-sheet is-expanded"
        role="dialog"
        aria-label={t('installTitleSafari')}
      >
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
            <button
              type="button"
              className="btn primary install-cta"
              onClick={dismiss}
            >
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

  // Windows / Android / Chrome / Edge
  const title =
    kind === 'windows' ? t('installTitleWindows') : t('installTitle');

  return (
    <div
      className={`install-sheet${canNative ? '' : ' is-expanded'}`}
      role="dialog"
      aria-label={title}
    >
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
                : kind === 'windows'
                  ? t('installTipWindows')
                  : kind === 'android'
                    ? t('installTipAndroid')
                    : t('installTipOther')}
            </p>
          </div>
        </div>

        {!canNative && (
          <ol className="install-steps">
            <li>
              {kind === 'windows'
                ? t('installTipWindows')
                : kind === 'android'
                  ? t('installTipAndroid')
                  : t('installTipOther')}
            </li>
          </ol>
        )}

        <div className="install-actions">
          {canNative ? (
            <button
              type="button"
              className="btn primary install-cta"
              disabled={busy}
              onClick={() => void installApp()}
            >
              {busy ? t('loading') : t('installNow')}
            </button>
          ) : (
            <button
              type="button"
              className="btn primary install-cta"
              onClick={dismiss}
            >
              {t('understood')}
            </button>
          )}
          <button type="button" className="btn ghost btn-sm" onClick={dismiss}>
            {t('notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
