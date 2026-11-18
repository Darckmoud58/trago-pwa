const TZ = 'America/Mexico_City';

/** Noche en Guadalajara: 19:00 – 05:59. */
export function isNightInMexico(now = new Date()): boolean {
  const hour = hourInTz(now, TZ);
  return hour >= 19 || hour < 6;
}

export function hourInTz(now: Date, timeZone = TZ): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
}

type MexicoWall = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function mexicoWallClock(now: Date, timeZone = TZ): MexicoWall {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Convierte reloj de pared en `timeZone` a instante UTC (ms). */
function wallTimeToUtcMs(
  wall: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
    second?: number;
  },
  timeZone = TZ
): number {
  const minute = wall.minute ?? 0;
  const second = wall.second ?? 0;
  let utc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    minute,
    second
  );
  for (let i = 0; i < 3; i += 1) {
    const asLocal = mexicoWallClock(new Date(utc), timeZone);
    const wanted = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      minute,
      second
    );
    const got = Date.UTC(
      asLocal.year,
      asLocal.month - 1,
      asLocal.day,
      asLocal.hour,
      asLocal.minute,
      asLocal.second
    );
    utc += wanted - got;
  }
  return utc;
}

function addCalendarDays(
  wall: Pick<MexicoWall, 'year' | 'month' | 'day'>,
  days: number
) {
  const base = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

/**
 * Ms hasta el próximo flip día↔noche (19:00 o 06:00 America/Mexico_City).
 * Para programar el cambio en vivo sin depender solo de setInterval (iOS lo congela).
 */
export function msUntilNextNightFlip(now = new Date(), timeZone = TZ): number {
  const wall = mexicoWallClock(now, timeZone);
  const night = wall.hour >= 19 || wall.hour < 6;
  let target: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
  if (!night) {
    // Día → flip a 19:00 hoy
    target = {
      year: wall.year,
      month: wall.month,
      day: wall.day,
      hour: 19,
      minute: 0,
      second: 0,
    };
  } else if (wall.hour >= 19) {
    // Noche → flip a 06:00 mañana
    const next = addCalendarDays(wall, 1);
    target = { ...next, hour: 6, minute: 0, second: 0 };
  } else {
    // Madrugada → flip a 06:00 hoy
    target = {
      year: wall.year,
      month: wall.month,
      day: wall.day,
      hour: 6,
      minute: 0,
      second: 0,
    };
  }
  const delta = wallTimeToUtcMs(target, timeZone) - now.getTime();
  // Mínimo 1s para no loop; tope 12h por si hay rareza de TZ
  return Math.min(Math.max(delta + 250, 1000), 12 * 60 * 60 * 1000);
}
