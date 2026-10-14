import axios from 'axios';

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

const saved = localStorage.getItem('token');
if (saved) setAuth(saved);
