/** Claves de sesión del “día de cumple” (America/Mexico_City). */

export function mexicoCityDayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function birthdaySplashKey(userId: string) {
  return `trago-bday-splash:${userId}:${mexicoCityDayKey()}`;
}

export function birthdayUnlockKey(userId: string) {
  return `trago-bday-unlocked:${userId}:${mexicoCityDayKey()}`;
}

export function readSessionFlag(key: string) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeSessionFlag(key: string) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}
