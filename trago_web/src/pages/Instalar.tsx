import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import {
  clearDeferredInstall,
  getDeferredInstall,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../lib/installPrompt';
import './Cuenta.css';
import './Idioma.css';

type Kind = 'ios' | 'windows' | 'android' | 'safari-mac' | 'other';

function detectKind(): Kind {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows|win64|win32|wow64/i.test(ua)) return 'windows';
  const safari =
    /safari/i.test(ua) && !/chrome|crios|fxios|edg|opr|android/i.test(ua);
  if (safari && /macintosh|mac os x/i.test(ua)) return 'safari-mac';
  return 'other';
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export default function Instalar() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => getDeferredInstall()
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const kind = detectKind();
  const installed = isStandalone();

  useEffect(() => {
    return subscribeInstallPrompt(setDeferred);
  }, []);

  async function install() {
    setBusy(true);
    setMsg('');
    try {
      let ev = deferred || getDeferredInstall();
      if (!ev) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 150));
          ev = getDeferredInstall();
          if (ev) break;
        }
      }
      if (!ev) {
        setMsg(
          kind === 'windows'
            ? t('installTipWindows')
            : kind === 'android'
              ? t('installTipAndroid')
              : t('installTipOther')
        );
        return;
      }
      setDeferred(ev);
      await ev.prompt();
      const choice = await ev.userChoice;
      clearDeferredInstall();
      setDeferred(null);
      if (choice.outcome === 'accepted') setMsg(t('understood'));
    } catch {
      setMsg(t('installTipOther'));
    } finally {
      setBusy(false);
    }
  }

  async function addHome() {
    setBusy(true);
    setMsg('');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'TraGo',
          text: t('installTitleIos'),
          url: window.location.origin + '/',
        });
      } else {
        setMsg(t('installTipIos'));
      }
    } catch {
      setMsg(t('installTipIos'));
    } finally {
      setBusy(false);
    }
  }

  const isApple = kind === 'ios' || kind === 'safari-mac';

  return (
    <section className="idioma-page">
      <header className="idioma-hero">
        <h2>{isApple ? t('installTitleIos') : t('installTitle')}</h2>
        <p>
          {installed
            ? t('online')
            : isApple
              ? t('installTipIos')
              : t('installTipReady')}
        </p>
      </header>

      {installed ? (
        <p className="muted">{t('understood')}</p>
      ) : (
        <>
          {isApple && (
            <ol className="settings-list" style={{ padding: '1rem', listStyle: 'decimal inside' }}>
              <li style={{ padding: '0.5rem 0' }}>{t('installStepIos1')}</li>
              <li style={{ padding: '0.5rem 0' }}>{t('installStepIos2')}</li>
              <li style={{ padding: '0.5rem 0' }}>{t('installStepIos3')}</li>
            </ol>
          )}

          <button
            type="button"
            className="btn primary"
            style={{ width: '100%', minHeight: '3rem', marginTop: '1rem' }}
            disabled={busy}
            onClick={() => void (isApple ? addHome() : install())}
          >
            {busy
              ? t('loading')
              : isApple
                ? t('installAddHome')
                : t('installNow')}
          </button>

          {msg && <p className="muted" style={{ marginTop: '0.85rem' }}>{msg}</p>}
        </>
      )}

      <p className="muted" style={{ marginTop: '1.25rem' }}>
        <Link to="/cuenta">{t('back')}</Link>
      </p>
    </section>
  );
}
