/** Alineado a server/src/lib/birthday.js — día en America/Mexico_City. */
const TZ = 'America/Mexico_City';

function datePartsInTz(now = new Date(), timeZone = TZ) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(now);
  return {
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? 0),
  };
}

function parseIsoDay(iso: string) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Compara mes/día del cumple con “hoy” en America/Mexico_City. */
export function isBirthdayToday(
  birth: string | Date | null | undefined,
  now = new Date()
): boolean {
  if (!birth) return false;
  const date = typeof birth === 'string' ? parseIsoDay(birth) : birth;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const today = datePartsInTz(now);
  const birthMonth =
    typeof birth === 'string' ? date.getMonth() + 1 : date.getUTCMonth() + 1;
  const birthDay =
    typeof birth === 'string' ? date.getDate() : date.getUTCDate();
  if (birthMonth === today.month && birthDay === today.day) return true;
  if (
    birthMonth === 2 &&
    birthDay === 29 &&
    today.month === 3 &&
    today.day === 1
  ) {
    return !isLeapYear(now.getFullYear());
  }
  return false;
}
