import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import pageloadUrl from '../assets/pageload.mp4';
import { useI18n } from '../lib/i18n';
import './PageLoadOverlay.css';

const FADE_MS = 320;
const MAX_SHOW_MS = 3500;

/** Rutas principales de la barra inferior (cambio de “pestaña”). */
function tabKey(pathname: string): string {
  if (pathname === '/') return 'inicio';
  if (pathname.startsWith('/promos')) return 'promos';
  if (pathname.startsWith('/cerca') || pathname.startsWith('/negocios'))
    return 'cerca';
  if (pathname.startsWith('/favoritos')) return 'favoritos';
  if (
    pathname.startsWith('/cuenta') ||
    pathname.startsWith('/entrar') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/idioma')
  )
    return 'cuenta';
  return pathname;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function PageLoadOverlay() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [phase, setPhase] = useState<'show' | 'exit' | 'hidden'>('show');
  const [playId, setPlayId] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tabRef = useRef(tabKey(pathname));
  const hideTimer = useRef<number | null>(null);
  const bootDone = useRef(false);

  function clearHideTimer() {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function finish() {
    clearHideTimer();
    setPhase((p) => (p === 'hidden' ? p : 'exit'));
    hideTimer.current = window.setTimeout(() => {
      setPhase('hidden');
      const v = videoRef.current;
      if (v) {
        v.pause();
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
    }, FADE_MS);
  }

  function requestPlay() {
    clearHideTimer();
    setPhase('show');
    setPlayId((n) => n + 1);
  }

  useEffect(() => {
    if (phase !== 'show' || playId < 1) return;

    // Cierra solo (sin tap). Tope por si el video no dispara ended.
    hideTimer.current = window.setTimeout(finish, MAX_SHOW_MS);

    if (prefersReducedMotion()) {
      return () => clearHideTimer();
    }

    const v = videoRef.current;
    if (!v) return () => clearHideTimer();

    const onEnded = () => finish();
    const onError = () => finish();
    v.addEventListener('ended', onEnded);
    v.addEventListener('error', onError);

    try {
      v.currentTime = 0;
    } catch {
      /* ignore */
    }

    const attempt = v.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.catch(() => {
        /* MAX_SHOW_MS cierra */
      });
    }

    return () => {
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('error', onError);
      clearHideTimer();
    };
  }, [phase, playId]);

  useEffect(() => {
    if (bootDone.current) return;
    bootDone.current = true;
    requestPlay();
    return () => clearHideTimer();
  }, []);

  useEffect(() => {
    const next = tabKey(pathname);
    if (next === tabRef.current) return;
    tabRef.current = next;
    if (!bootDone.current) return;
    requestPlay();
  }, [pathname]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`pageload${phase === 'exit' ? ' is-exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={phase === 'show'}
      aria-hidden={phase === 'exit'}
    >
      <div className="pageload-stage">
        <video
          ref={videoRef}
          className="pageload-video"
          src={pageloadUrl}
          muted
          playsInline
          preload="auto"
          aria-label="TraGo"
        />
        <p className="pageload-status">{t('loading')}</p>
      </div>
    </div>
  );
}
