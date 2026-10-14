import axios from 'axios';
import { getAgeBand } from './lib/ageBand';

// Vacío en local → proxy Vite /api → :4000. En Netlify → Function /api/*.
// Alternativa explícita: VITE_API_URL=http://localhost:4000
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

export function setAuth(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

api.interceptors.request.use((config) => {
  const band = getAgeBand();
  if (band) {
    config.headers.set('X-Trago-Band', band);
  } else {
    config.headers.delete('X-Trago-Band');
  }
  return config;
});

const saved = localStorage.getItem('token');
if (saved) setAuth(saved);
