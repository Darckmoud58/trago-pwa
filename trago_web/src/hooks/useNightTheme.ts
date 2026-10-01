import { useEffect, useState } from 'react';
import { isNightInMexico } from '../lib/night';

const THEME_COLOR_DAY = '#3B0B13';
const THEME_COLOR_NIGHT = '#000000';

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
    function sync() {
      const next = isNightInMexico();
      setNight(next);
      applyNight(next);
    }

    sync();
    const id = window.setInterval(sync, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return night;
}
