import type { SessionUser } from "./types";
import { hasMongoUri } from "./mongo";

export function panelEmails(): string[] {
  return (process.env.CHAIN_PANEL_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPanelEmail(user: SessionUser | null): boolean {
  if (!user?.isAdult || !user.email) return false;
  const allowed = panelEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(user.email.toLowerCase());
}

/** Operadores por lista env o dueños de cadena registrada. */
export async function canOperatePanel(user: SessionUser | null): Promise<boolean> {
  if (!user?.isAdult) return false;
  if (isPanelEmail(user)) return true;
  if (!hasMongoUri()) return false;
  const { userOwnsChain } = await import("./queries");
  return userOwnsChain(user.id);
}
