/** Edad mínima cuenta / alcohol — alineado a TraGo (México). */
export const MIN_AGE = 18;
export const MIN_ACCOUNT_AGE = 13;

export function ageFromBirthDate(birth: Date, now = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function maxBirthDateForMinAge(years: number, now = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function maxBirthDateForAccount(now = new Date()): string {
  return maxBirthDateForMinAge(MIN_ACCOUNT_AGE, now);
}
