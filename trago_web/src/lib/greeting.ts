import { hourInTz } from './night';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPartInMexico(now = new Date()): DayPart {
  const h = hourInTz(now);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 19) return 'afternoon';
  if (h >= 19 && h < 22) return 'evening';
  return 'night';
}

/** Clave i18n para saludo: helloMorning | helloAfternoon | helloEvening | helloNight */
export function greetingKey(part: DayPart = dayPartInMexico()): string {
  if (part === 'morning') return 'helloMorning';
  if (part === 'afternoon') return 'helloAfternoon';
  if (part === 'evening') return 'helloEvening';
  return 'helloNight';
}
