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
