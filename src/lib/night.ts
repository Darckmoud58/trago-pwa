const TZ = "America/Mexico_City";

/** Noche en Guadalajara / hora del centro: 19:00 – 05:59. */
export function isNightInMexico(now = new Date()): boolean {
  const hour = hourInTz(now, TZ);
  return hour >= 19 || hour < 6;
}

export function hourInTz(now: Date, timeZone = TZ): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export function datePartsInTz(now = new Date(), timeZone = TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(now);
  return {
    day: Number(parts.find((p) => p.type === "day")?.value ?? 0),
    month: Number(parts.find((p) => p.type === "month")?.value ?? 0),
  };
}

export function isBirthdayToday(birth: Date | string, now = new Date()): boolean {
  const date = typeof birth === "string" ? parseIsoDay(birth) : birth;
  if (Number.isNaN(date.getTime())) return false;
  const today = datePartsInTz(now);
  const birthMonth = date.getMonth() + 1;
  const birthDay = date.getDate();
  if (birthMonth === today.month && birthDay === today.day) return true;
  if (birthMonth === 2 && birthDay === 29 && today.month === 3 && today.day === 1) {
    return !isLeapYear(now.getFullYear());
  }
  return false;
}

function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function birthDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
