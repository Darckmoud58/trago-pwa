export type AgeBand = 'teen' | 'adult';

const KEY = 'trago_band';

export function getAgeBand(): AgeBand | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'teen' || v === 'adult') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setAgeBand(band: AgeBand) {
  try {
    localStorage.setItem(KEY, band);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('trago:band', { detail: band }));
}

export function clearAgeBand() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
