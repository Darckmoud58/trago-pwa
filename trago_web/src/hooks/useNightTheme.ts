import { useEffect, useState } from 'react';
import { isNightInMexico, msUntilNextNightFlip } from '../lib/night';

const THEME_COLOR_DAY = '#820808';
const THEME_COLOR_NIGHT = '#000000';
/** Respaldo corto solo con app visible (iOS congela intervalos largos). */
const VISIBLE_POLL_MS = 20_000;

function applyNight(night: boolean) {
  const root = document.documentElement;
  if (night) root.setAttribute('data-theme', 'night');
  else root.removeAttribute('data-theme');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', night ? THEME_COLOR_NIGHT : THEME_COLOR_DAY);
  }

  const status = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (status) {
    status.setAttribute('content', night ? 'black' : 'black-translucent');
  }
}

/** Activa paleta tinto/negro de noche (hora México, 19:00–05:59). */
export function useNightTheme() {
  const [night, setNight] = useState(() =>
    typeof window !== 'undefined' ? isNightInMexico() : false
  );

  useEffect(() => {
    let flipTimer = 0;
    let pollTimer = 0;

    function sync() {
      const next = isNightInMexico();
      setNight((prev) => (prev === next ? prev : next));
      applyNight(next);
    }

    function scheduleFlip() {
      window.clearTimeout(flipTimer);
      const wait = msUntilNextNightFlip();
      flipTimer = window.setTimeout(() => {
        sync();
        scheduleFlip();
      }, wait);
    }

    function clearPoll() {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = 0;
      }
    }

    function startPollIfVisible() {
      clearPoll();
      if (document.visibilityState !== 'visible') return;
      pollTimer = window.setInterval(sync, VISIBLE_POLL_MS);
    }

    function onWake() {
      sync();
      scheduleFlip();
      startPollIfVisible();
    }

    sync();
    scheduleFlip();
    startPollIfVisible();

    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);

    return () => {
      window.clearTimeout(flipTimer);
      clearPoll();
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, []);

  return night;
}
