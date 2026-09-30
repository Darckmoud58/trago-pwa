import axios from 'axios';

// Vacío en Netlify → mismas rutas /api/* (Function). En local: VITE_API_URL=http://localhost:4001
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
