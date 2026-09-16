# TraGo

PWA / app de **promociones vigentes** en Guadalajara.

> Alcohol: 18+.

## Estructura (igual que Todo_pwa)

| Todo_pwa | TraGo | Arranque |
|----------|-------|----------|
| `todo_pwaa/` (Vite + React + TS + axios) | `trago_web/` | `npm run dev` |
| `server/` (Express + Mongoose) | `server/` | `npm start` |

```
trago/
├── server/      → API Express :4000   →  npm start
└── trago_web/   → Front Vite :5173   →  npm run dev
```

Creado con:

```bash
npm create vite@latest trago_web -- --template react-ts
npm install axios react-router-dom
```

`VITE_API_URL=http://localhost:4000` (mismo patrón que Todo_pwa).

## Arranque local (2 terminales)

```bash
# Terminal 1 — API
cd PW/trago/server
npm install
npm start

# Terminal 2 — Front
cd PW/trago/trago_web
npm install
npm run dev
```

- API: http://localhost:4000  
- Front: http://localhost:5173  

Desde la raíz:

```bash
npm run start:server
npm run dev:web
```

## Rutas del front

| Ruta | Qué hace |
|------|----------|
| `/` | Home TraGo |
| `/entrar` / `/registro` | Auth JWT (axios → Express) |
| `/promos` | `GET /api/promociones` |
| `/cerca` | GPS + `GET /api/sucursales/cerca` |
| `/negocios` | `GET /api/negocios` |
| `/cuenta` | `GET /api/auth/me` |

## Docker (Mongo + API)

```bash
docker compose up -d
```

Front sigue en local con `npm run dev` en `trago_web`.

## Legacy Next

El monolitico Next quedó en `web_next_legacy/` solo como referencia. El flujo de clase es **Vite + Express**, como Todo_pwa.

## Stack

**trago_web:** Vite · React 19 · TypeScript · axios · React Router  
**server:** Express 5 · Mongoose · JWT · CORS
