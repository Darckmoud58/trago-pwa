# TraGo en Vercel (mismo patrón que Todo_pwa)

Dos proyectos Vercel sobre el mismo repo GitHub (`Darckmoud58/trago-pwa`). Tú importas; el código ya trae `vercel.json` en cada carpeta.

```
trago/
├── trago_web/   → proyecto Front (PWA)
│   └── vercel.json
└── server/      → proyecto API (Express)
    ├── api/index.js
    └── vercel.json
```

Netlify (`netlify.toml`) se deja como legado hasta el cutover.

---

## 1. Proyecto API

1. Vercel → **Add New Project** → Import `trago-pwa`.
2. **Root Directory:** `server`
3. Framework: Other. Build Command: vacío (o `echo skip`). Output: vacío.
4. Deploy.

### Variables de entorno (API)

| Variable | Valor |
|----------|--------|
| `MONGODB_URI` | Atlas (mismo cluster de TraGo) |
| `MONGODB_DB` | `trago` |
| `JWT_SECRET` | ≥32 chars (`openssl rand -base64 48`) |
| `CORS_ORIGINS` | `https://<tu-front>.vercel.app` (coma si hay previews) |
| `CRON_SECRET` | secreto largo para GitHub Actions |
| `TRUST_PROXY` | `1` |
| `AGE_COOKIE_SAMESITE` | `none` (front y API en dominios distintos) |
| `VAPID_SUBJECT` | `mailto:tu@correo.com` |
| `VAPID_PUBLIC_KEY` | de `npm run vapid` |
| `VAPID_PRIVATE_KEY` | de `npm run vapid` |
| `NODE_ENV` | `production` |

`VERCEL=1` lo inyecta la plataforma.

Generar VAPID en local:

```bash
cd server && npm run vapid
```

Smoke: `GET https://<api>.vercel.app/` → `{ ok: true, name: "trago-api" }`.

**Nota:** `maxDuration` 60 s en `server/vercel.json` (scrapers). En plan Hobby el tope real puede ser menor; el cron de refresh puede cortarse — reintenta con *Run workflow* o sube a Pro.

---

## 2. Proyecto Front (PWA)

1. Otro **Add New Project** → mismo repo.
2. **Root Directory:** `trago_web`
3. Framework: Vite. Build: `npm run build`. Output: `dist`.
4. Env:

| Variable | Valor |
|----------|--------|
| `VITE_API_URL` | `https://<tu-api>.vercel.app` (**sin** `/api` al final) |

5. Redeploy el front tras fijar la URL de la API.
6. Si cambia el dominio del front, actualiza `CORS_ORIGINS` en la API y redeploy API.

---

## 3. GitHub Actions (crons)

En el repo → Settings → Secrets and variables → Actions:

| Secret | Valor |
|--------|--------|
| `API_URL` | `https://<tu-api>.vercel.app` (sin `/` final) |
| `CRON_SECRET` | el mismo que en Vercel API |

Workflows:

- `.github/workflows/trago-refresh-official.yml` — cada 6 h → `POST /api/cron/refresh-official`
- `.github/workflows/trago-push-birthday.yml` — `0 15 * * *` UTC (~09:00 CDMX) → `POST /api/push/birthday`

Prueba: Actions → *Run workflow* en cada uno.

---

## 4. Smoke test PWA (paridad Todo_pwa)

Tras el deploy:

1. **Instalar / descargar** — en Chrome Android o desktop: banner Instalar / menú “Instalar TraGo”.
2. **Sin conexión** — abre Home/Promos online una vez; modo avión; debe verse el shell + catálogo cacheado.
3. **Notificaciones** — Cuenta → activar; `POST /api/push/test` desde la UI.
4. **Actualizar** — tras un redeploy del front, banner “Hay una versión nueva” → Actualizar (debe recargar).
5. **GPS / Cerca** — permiso de ubicación; no inventar punto si falla.
6. **CORS** — login y favoritos contra la API en otro origen.

---

## 5. Checklist rápido de import

- [ ] API desplegada, `GET /` OK
- [ ] Front con `VITE_API_URL` apuntando a la API
- [ ] `CORS_ORIGINS` incluye el origen HTTPS del front
- [ ] `AGE_COOKIE_SAMESITE=none` + `TRUST_PROXY=1`
- [ ] VAPID en API; push de prueba OK
- [ ] Secrets Actions `API_URL` + `CRON_SECRET`
- [ ] Run workflow refresh + birthday sin 401

Cuando Vercel esté estable, se puede apagar el sitio Netlify y dejar de depender de `netlify/functions`.
