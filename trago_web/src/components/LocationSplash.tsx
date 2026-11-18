import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  birthdaySplashKey,
  readSessionFlag,
} from '../lib/birthdayDay';
import { useI18n, type MessageKey } from '../lib/i18n';
import { ICON_ART_512 } from '../lib/iconVersion';
import { setLastKnownGps } from '../lib/lastKnownGps';
import { trackGps } from '../lib/metrics';
import {
  finishOnboarding,
  hasSeenOnboarding,
  markOnboardingOpen,
  ONBOARDING_OPEN,
} from '../lib/onboarding';
import './LocationSplash.css';

const PAGELOAD_DONE = 'trago:pageload-done';
const PAGELOAD_FALLBACK_MS = 4500;

const STEPS: {
  title: MessageKey;
  body: MessageKey;
  label: MessageKey;
  icon: string;
}[] = [
  {
    title: 'tourWelcomeTitle',
    body: 'tourWelcomeBody',
    label: 'tourWelcomeLabel',
    icon: '✦',
  },
  {
    title: 'tourOffersTitle',
    body: 'tourOffersBody',
    label: 'tourOffersLabel',
    icon: '%',
  },
  {
    title: 'tourSessionTitle',
    body: 'tourSessionBody',
    label: 'tourSessionLabel',
    icon: '◔',
  },
  {
    title: 'tourNearTitle',
    body: 'tourNearBody',
    label: 'tourNearLabel',
    icon: '◎',
  },
  {
    title: 'tourBranchTitle',
    body: 'tourBranchBody',
    label: 'tourBranchLabel',
    icon: '✓',
  },
];

/**
 * Bienvenida guiada con Traguito (5 pasos).
 * Sustituye el splash que pedía GPS y mandaba a /cerca.
 */
export default function LocationSplash() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { birthdayToday, user, loading } = useAuthUser();
  const userId = user?.id || user?._id || '';
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [bootReady, setBootReady] = useState(false);
  const [bdayClear, setBdayClear] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(false);
  const [busyGps, setBusyGps] = useState(false);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

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

  useEffect(() => {
    if (loading) return;
    if (!birthdayToday || !userId) {
      setBdayClear(true);
      return;
    }
    if (readSessionFlag(birthdaySplashKey(userId))) {
      setBdayClear(true);
      return;
    }
    const onClosed = () => setBdayClear(true);
    window.addEventListener('trago-bday-splash-closed', onClosed);
    return () =>
      window.removeEventListener('trago-bday-splash-closed', onClosed);
  }, [loading, birthdayToday, userId]);

  useEffect(() => {
    if (!bootReady || !bdayClear) return;
    if (hasSeenOnboarding()) return;
    setReplay(false);
    setStep(0);
    setOpen(true);
    markOnboardingOpen();
  }, [bootReady, bdayClear]);

  useEffect(() => {
    const reopen = () => {
      setReplay(true);
      setStep(0);
      setBusyGps(false);
      setOpen(true);
      markOnboardingOpen();
    };
    window.addEventListener(ONBOARDING_OPEN, reopen);
    return () => window.removeEventListener(ONBOARDING_OPEN, reopen);
  }, []);

  useEffect(() => {
    const modal = dialog.current;
    if (!open || !modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!modal.open) modal.showModal();
    heading.current?.focus();
    return () => {
      if (modal.open) modal.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) heading.current?.focus();
  }, [step, open]);

  function close(destination?: 'near' | 'catalog' | 'home') {
    setOpen(false);
    setBusyGps(false);
    // Primero liberar el gate de Home (SPLASH_CLOSED → loadNear con GPS).
    // No navegar a '/' si ya estamos en Inicio: remount cancelaba la carga.
    finishOnboarding(destination === 'home' ? undefined : destination);
    if (destination === 'near') navigate('/cerca');
    else if (destination === 'catalog') navigate('/promos');
  }

  function skip() {
    // Primera visita: catálogo sin GPS. Repetición: quédate donde estabas.
    close(replay ? undefined : 'catalog');
  }

  /** Cierra el tutorial y abre la política elegida. */
  function openLegal(path: '/terminos' | '/aviso-de-privacidad') {
    setOpen(false);
    setBusyGps(false);
    finishOnboarding();
    navigate(path);
  }

  /** Pide GPS y deja al usuario en Inicio para que Home cargue /cerca con esas coords. */
  function enableLocationAndStayHome() {
    if (busyGps) return;
    if (!navigator.geolocation) {
      close('home');
      return;
    }
    setBusyGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLastKnownGps(pos.coords.latitude, pos.coords.longitude);
        void trackGps(true, pos.coords.latitude, pos.coords.longitude);
        close('home');
      },
      () => {
        void trackGps(false);
        // Permiso denegado o error: igual seguimos en Inicio (Home pedirá de nuevo).
        close('home');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }

  return (
    <dialog
      ref={dialog}
      className="traguito-tour"
      aria-labelledby="traguito-tour-title"
      aria-describedby="traguito-tour-body"
      onCancel={(event) => {
        event.preventDefault();
        skip();
      }}
    >
      {open ? (
        <div className="traguito-tour-inner">
          <header className="traguito-tour-top">
            <span className="traguito-tour-brand">
              TraGo <span>✦</span>
            </span>
            <button
              type="button"
              className="traguito-tour-skip"
              onClick={skip}
              disabled={busyGps}
            >
              {t('tourSkip')}
            </button>
          </header>

          <div
            className={`traguito-tour-stage traguito-tour-stage-${step}`}
            aria-hidden="true"
          >
            <div className="traguito-tour-orbit" />
            {step === 3 ? (
              <div className="traguito-tour-map" role="presentation">
                <span className="traguito-tour-map-pin is-a" />
                <span className="traguito-tour-map-pin is-b" />
                <span className="traguito-tour-map-pin is-c" />
              </div>
            ) : null}
            <img
              key={step}
              className="traguito-tour-mascot"
              src={ICON_ART_512}
              alt=""
              width={512}
              height={512}
              decoding="async"
            />
            <span className="traguito-tour-symbol">{current.icon}</span>
            <span className="traguito-tour-sticker">{t(current.label)}</span>
          </div>

          <div className="traguito-tour-copy" key={`copy-${step}`}>
            <p className="traguito-tour-eyebrow">{t('tourGuide')}</p>
            <h2 ref={heading} id="traguito-tour-title" tabIndex={-1}>
              {t(current.title)}
            </h2>
            <p id="traguito-tour-body">{t(current.body)}</p>

            {step === 1 ? (
              <div className="traguito-tour-example">
                <span>{t('tourExample')}</span>
                <strong>{t('tourExamplePrice')}</strong>
                <small>{t('tourExampleTerms')}</small>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="traguito-tour-legal">
                <p className="traguito-tour-note">{t('tourSessionLegal')}</p>
                <div className="traguito-tour-legal-links">
                  <Link
                    to="/terminos"
                    className="traguito-tour-legal-link"
                    onClick={(event) => {
                      event.preventDefault();
                      openLegal('/terminos');
                    }}
                  >
                    {t('tourTermsCta')}
                  </Link>
                  <Link
                    to="/aviso-de-privacidad"
                    className="traguito-tour-legal-link"
                    onClick={(event) => {
                      event.preventDefault();
                      openLegal('/aviso-de-privacidad');
                    }}
                  >
                    {t('tourPrivacyCta')}
                  </Link>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <p className="traguito-tour-note">{t('tourLocationNote')}</p>
            ) : null}

            {step === 4 ? (
              <div className="traguito-tour-statuses">
                <span>
                  <strong>✓ </strong>
                  {t('tourConfirmed')}
                </span>
                <span>
                  <strong>? </strong>
                  {t('tourUnconfirmed')}
                </span>
              </div>
            ) : null}
          </div>

          <footer className="traguito-tour-footer">
            <div
              className="traguito-tour-progress"
              aria-label={t('tourProgress', {
                step: step + 1,
                total: STEPS.length,
              })}
            >
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={index === step ? 'is-current' : ''}
                />
              ))}
              <small>
                {step + 1} / {STEPS.length}
              </small>
            </div>
            <div className="traguito-tour-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busyGps}
                  onClick={() => setStep(step - 1)}
                >
                  {t('tourBack')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn primary"
                disabled={busyGps}
                onClick={() =>
                  last ? enableLocationAndStayHome() : setStep(step + 1)
                }
              >
                {busyGps
                  ? t('locSplashBusy')
                  : t(last ? 'locSplashEnable' : 'tourNext')}
                {!last ? <span aria-hidden="true"> ↗</span> : null}
              </button>
            </div>
            {last ? (
              <>
                <p className="traguito-tour-note">{t('tourEnableStayHome')}</p>
                <button
                  type="button"
                  className="traguito-tour-catalog"
                  disabled={busyGps}
                  onClick={() => close('near')}
                >
                  {t('tourFindNear')}
                </button>
                <button
                  type="button"
                  className="traguito-tour-catalog"
                  disabled={busyGps}
                  onClick={() => close('catalog')}
                >
                  {t('tourCatalog')}
                </button>
              </>
            ) : null}
            <p className="traguito-tour-replay-note">{t('tourReplayNote')}</p>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}
