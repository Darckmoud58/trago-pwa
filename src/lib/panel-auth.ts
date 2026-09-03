import type { SessionUser } from "./types";

export function panelEmails(): string[] {
  return (process.env.CHAIN_PANEL_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function canOperatePanel(user: SessionUser | null): boolean {
  if (!user?.isAdult || !user.email) return false;
  const allowed = panelEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(user.email.toLowerCase());
}
