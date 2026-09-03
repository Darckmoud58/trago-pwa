/** Mayoría de edad para alcohol en México. */
export const MIN_AGE = 18;

export function ageFromBirthDate(birth: Date, now = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function isAdult(birth: Date, now = new Date()): boolean {
  return ageFromBirthDate(birth, now) >= MIN_AGE;
}

export function maxBirthDateForAdult(now = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
}
