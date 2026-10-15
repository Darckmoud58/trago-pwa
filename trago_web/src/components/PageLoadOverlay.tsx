import { useEffect, useRef, useState } from 'react';
import pageloadUrl from '../assets/pageload.mp4';
import { useI18n } from '../lib/i18n';
import { isNightInMexico } from '../lib/night';
import './PageLoadOverlay.css';

const FADE_MS = 320;
const MAX_SHOW_MS = 3500;
/** Píxeles con luminancia ≥ esto se vuelven transparentes (placa blanca del mp4). */
const WHITE_LUMA = 242;
const WHITE_SOFT = 18;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function knockOutWhite(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const frame = ctx.getImageData(0, 0, w, h);
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma < WHITE_LUMA - WHITE_SOFT) continue;
    if (luma >= WHITE_LUMA) {
      d[i + 3] = 0;
      continue;
    }
    // Borde suave para no dejar halo duro
    const t = (luma - (WHITE_LUMA - WHITE_SOFT)) / WHITE_SOFT;
    d[i + 3] = Math.round(d[i + 3] * (1 - t));
  }
  ctx.putImageData(frame, 0, 0);
}

/** Solo al entrar a la app (primer montaje), no al cambiar de pestaña. */
export default function PageLoadOverlay() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'show' | 'exit' | 'hidden'>('show');
  const [playId, setPlayId] = useState(0);
  const [night] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') === 'night' ||
        isNightInMexico()
      : false
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const bootDone = useRef(false);

  function clearHideTimer() {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function stopPaint() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function finish() {
    clearHideTimer();
    stopPaint();
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

  useEffect(() => {
    if (phase !== 'show' || playId < 1) return;

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

    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(paint);
        return;
      }
      const w = v.videoWidth || 512;
      const h = v.videoHeight || 512;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(v, 0, 0, w, h);
        if (night) knockOutWhite(ctx, w, h);
      }
      if (!v.paused && !v.ended) {
        rafRef.current = requestAnimationFrame(paint);
      }
    };

    const startPaint = () => {
      stopPaint();
      rafRef.current = requestAnimationFrame(paint);
    };

    v.addEventListener('playing', startPaint);
    v.addEventListener('seeked', startPaint);

    const attempt = v.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt
        .then(() => startPaint())
        .catch(() => {
          /* MAX_SHOW_MS cierra */
        });
    } else {
      startPaint();
    }

    return () => {
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('error', onError);
      v.removeEventListener('playing', startPaint);
      v.removeEventListener('seeked', startPaint);
      stopPaint();
      clearHideTimer();
    };
  }, [phase, playId, night]);

  useEffect(() => {
    if (bootDone.current) return;
    bootDone.current = true;
    setPhase('show');
    setPlayId(1);
    return () => {
      clearHideTimer();
      stopPaint();
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`pageload${phase === 'exit' ? ' is-exit' : ''}${night ? ' is-night' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={phase === 'show'}
      aria-hidden={phase === 'exit'}
    >
      <div className="pageload-stage">
        <video
          ref={videoRef}
          className="pageload-video-source"
          src={pageloadUrl}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <canvas
          ref={canvasRef}
          className="pageload-video"
          aria-label="TraGo"
        />
        <p className="pageload-status">{t('loading')}</p>
      </div>
    </div>
  );
}
