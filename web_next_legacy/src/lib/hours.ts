import { hourInTz } from "./night";

const TZ = "America/Mexico_City";

export function minutesInMexico(now = new Date()): number {
  const hour = hourInTz(now, TZ);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    minute: "2-digit",
  }).formatToParts(now);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function parseHours(hours: string): {
  always: boolean;
  start: number;
  end: number;
} | null {
  const compact = hours.trim().toLowerCase().replace(/\s+/g, " ");
  if (compact === "24 h" || compact === "24h" || compact.includes("24 h")) {
    return { always: true, start: 0, end: 24 * 60 };
  }
  const m = compact.match(/(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  return { always: false, start, end };
}

/** Si no se puede parsear el horario, no ocultamos el local. */
export function isBranchOpen(hours: string, now = new Date()): boolean {
  const parsed = parseHours(hours);
  if (!parsed) return true;
  if (parsed.always) return true;
  const minutes = minutesInMexico(now);
  if (parsed.end > parsed.start) {
    return minutes >= parsed.start && minutes < parsed.end;
  }
  return minutes >= parsed.start || minutes < parsed.end;
}
