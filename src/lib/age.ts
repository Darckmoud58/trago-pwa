/** Mayoría de edad para alcohol en México. */
export const MIN_AGE = 18;
/** Edad mínima para crear cuenta (perfil joven). */
export const MIN_ACCOUNT_AGE = 13;

export type AgeBand = "teen" | "adult";

export function ageFromBirthDate(birth: Date, now = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function isAdult(birth: Date, now = new Date()): boolean {
  return ageFromBirthDate(birth, now) >= MIN_AGE;
}

export function canOpenAccount(birth: Date, now = new Date()): boolean {
  return ageFromBirthDate(birth, now) >= MIN_ACCOUNT_AGE;
}

export function ageBandFromBirth(birth: Date, now = new Date()): AgeBand {
  return isAdult(birth, now) ? "adult" : "teen";
}

/** Fecha máxima de nacimiento para cumplir al menos `years` años hoy. */
export function maxBirthDateForMinAge(years: number, now = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function maxBirthDateForAdult(now = new Date()): string {
  return maxBirthDateForMinAge(MIN_AGE, now);
}

export function maxBirthDateForAccount(now = new Date()): string {
  return maxBirthDateForMinAge(MIN_ACCOUNT_AGE, now);
}
