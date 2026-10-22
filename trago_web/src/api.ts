import axios from 'axios';

/** Sesión de TraGo. `token` lo usa también Todo_pwa en el mismo origen (preview :4173). */
const TOKEN_KEY = 'trago_token';

// Vacío en local → proxy Vite /api → :4000. En Netlify → Function /api/*.
// Alternativa explícita: VITE_API_URL=http://localhost:4000
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});

export function setAuth(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!encoded) return null;
    const json = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
    const payload = JSON.parse(json) as Record<string, unknown>;
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/** TraGo firma `band` y `tv`. Un JWT de otra app en el mismo origen no se envía. */
function isTragoToken(token: string) {
  const payload = jwtPayload(token);
  return Boolean(payload && ('band' in payload || 'tv' in payload));
}

export function readToken(): string | null {
  try {
    const current = localStorage.getItem(TOKEN_KEY);
    if (current && isTragoToken(current)) return current;
    if (current) localStorage.removeItem(TOKEN_KEY);
    const legacy = localStorage.getItem('token');
    if (legacy && isTragoToken(legacy)) {
      localStorage.setItem(TOKEN_KEY, legacy);
      return legacy;
    }
  } catch {
    /* storage bloqueado */
  }
  return null;
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  setAuth(token);
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    const legacy = localStorage.getItem('token');
    if (legacy && isTragoToken(legacy)) localStorage.removeItem('token');
  } catch {
    /* storage bloqueado */
  }
  setAuth(null);
}

const saved = readToken();
if (saved) setAuth(saved);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error?.config?.url || '');
    const sentAuth = Boolean(
      error?.config?.headers?.Authorization || error?.config?.headers?.authorization
    );
    const isLogin =
      url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (error?.response?.status === 401 && sentAuth && !isLogin && readToken()) {
      clearToken();
      window.dispatchEvent(new Event('trago-session'));
    }
    return Promise.reject(error);
  }
);
