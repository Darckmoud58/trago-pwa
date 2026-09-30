import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import pageloadUrl from '../assets/pageload.mp4';
import './PageLoadOverlay.css';

const FADE_MS = 320;

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
    pathname.startsWith('/registro')
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

    if (prefersReducedMotion()) {
      hideTimer.current = window.setTimeout(finish, 600);
      return () => clearHideTimer();
    }

    const v = videoRef.current;
    if (!v) {
      hideTimer.current = window.setTimeout(finish, 900);
      return () => clearHideTimer();
    }

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
        hideTimer.current = window.setTimeout(finish, 800);
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
      role="presentation"
      aria-hidden={phase === 'exit'}
      onClick={finish}
    >
      <video
        ref={videoRef}
        className="pageload-video"
        src={pageloadUrl}
        muted
        playsInline
        preload="auto"
        aria-label="TraGo"
      />
      <p className="pageload-skip">Toca para continuar</p>
    </div>
  );
}
