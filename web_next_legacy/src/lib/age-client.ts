/** Edad en cliente (mismo criterio que src/lib/age.ts). */
export const MIN_AGE = 18;
export const MIN_ACCOUNT_AGE = 13;

export function parseBirthDate(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ageFromBirthDate(birth: Date, now = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function isAdult(birth: Date, now = new Date()): boolean {
  return ageFromBirthDate(birth, now) >= MIN_AGE;
}

export function maxBirthDateForAccount(now = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - MIN_ACCOUNT_AGE);
  return d.toISOString().slice(0, 10);
}

export function maxBirthDateForAdult(now = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
}
