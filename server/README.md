# TraGo API (clase PWA)

API Express + Mongoose — mismo patrón que `Todo_pwa/server`.

## Arranque

```bash
cd server
cp .env.example .env
npm install
npm start
# catálogo demo (promos + GPS):
npm run seed
```

→ http://localhost:4000

Front: `../trago_web` → `npm run dev` (Vite, puerto 5173).

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Salud |
| POST | `/api/auth/register` | Registro (+ birthDate) |
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/auth/me` | Perfil (Bearer) |
| GET | `/api/promociones` | Promos |
| GET | `/api/negocios` | Negocios |
| GET | `/api/sucursales/cerca?lng=&lat=` | GeoNear |
| GET | `/api/promociones/:promoId/sucursales` | Links |
| GET | `/api/push/subscribe` | Estado VAPID + clave pública |
| POST | `/api/push/subscribe` | Guardar suscripción (Bearer) |
| POST | `/api/push/birthday` | Enviar push de cumple (cron o admin) |

Web Push: `npm run vapid` → pega claves en `.env`. Cron opcional con `CRON_SECRET`.

## Pareja con el front

| | Front | Backend |
|--|-------|---------|
| Todo_pwa | `todo_pwaa` + `VITE_API_URL` | `server` |
| TraGo | `trago_web` + `VITE_API_URL` | `server` |
