/**
 * Cliente HTTP hacia el Express de `../server` (puerto 4000),
 * mismo patrón que Todo_pwa/todo_pwaa/src/api.ts (VITE_API_URL).
 *
 * Las rutas Next `/api/*` del propio front siguen usándose en producción Netlify.
 * Usa este cliente para catálogo/auth de clase contra el server Express.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

export function getApiUrl(path = ""): string {
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${API_URL}${p}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<Response> {
  const { token, headers, ...rest } = init ?? {};
  const h = new Headers(headers);
  if (!h.has("Content-Type") && rest.body) {
    h.set("Content-Type", "application/json");
  }
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
  }
  return fetch(getApiUrl(path), { ...rest, headers: h });
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("trago_api_token", token);
  } else {
    localStorage.removeItem("trago_api_token");
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("trago_api_token");
}
