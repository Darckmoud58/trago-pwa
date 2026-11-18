/** Preferencia local del tutorial; no guarda ubicación ni datos personales. */
export const ONBOARDING_KEY = 'trago_onboarding_v1';
export const ONBOARDING_OPEN = 'trago-onboarding-open';
export const SPLASH_OPENED = 'trago-splash-opened';
export const SPLASH_CLOSED = 'trago-splash-closed';

let dismissedThisSession = false;
let showing = false;

export function hasSeenOnboarding() {
  if (dismissedThisSession) return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function isOnboardingPending() {
  return showing || !hasSeenOnboarding();
}

/** Solo true mientras el diálogo de Traguito está abierto (no “aún no visto”). */
export function isOnboardingOpen() {
  return showing;
}

export function markOnboardingOpen() {
  showing = true;
  window.dispatchEvent(new Event(SPLASH_OPENED));
}

export function finishOnboarding(destination?: 'near' | 'catalog' | 'home') {
  dismissedThisSession = true;
  showing = false;
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
    // Compatibilidad con el banner de instalación anterior.
    localStorage.setItem('trago_loc_splash_v2', '1');
  } catch {
    /* almacenamiento bloqueado: la sesión ya recuerda la decisión */
  }
  window.dispatchEvent(
    new CustomEvent(SPLASH_CLOSED, {
      detail: { destination: destination === 'home' ? undefined : destination },
    })
  );
}

export function replayOnboarding() {
  window.dispatchEvent(new Event(ONBOARDING_OPEN));
}

/**
 * ¿El permiso de geolocalización ya está concedido?
 * Sin Permissions API no sondeamos (evitar prompt).
 */
export async function hasGeolocationGranted(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return false;
  const perms = navigator.permissions;
  if (!perms?.query) return false;
  try {
    const status = await perms.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch {
    return false;
  }
}
