# TraGo

PWA de **promociones vigentes de cadenas** en **Guadalajara**: comida, café, alcohol y regalos de cumpleaños. Vigencia **por sucursal** y **GPS**.

> Contenido de alcohol: 18+.

## Qué resuelve

No basta con “hay 2x1 en la cadena”. TraGo responde: **¿en esta sucursal, ahora, todavía aplica?**

### Modelo (tesis del profesor)

| Actor | Qué hace | Incentivo |
|--------|----------|-----------|
| **Página oficial** | TraGo lee promociones públicas | Fuente verificable |
| **Empresa** | Se registra, publica ofertas en el panel | Reputación + pies en puerta |
| **Usuario** | Vota vigencia (GPS), opina en sucursal | Puntos → cupones TraGo |

Las opiniones y reportes son el incentivo para que la cadena **cumpla** lo anunciado.

## Seguridad (anti-abuso)

- Opinión: **una por promo+sucursal**; puntos solo la 1.ª vez y **solo con GPS cerca**
- Voto: puntos solo el **primer** reporte de ese par promo/local
- Tope **40 pts / 24 h**; ledger único por `refKey`
- Login: bloqueo tras 5 fallos, rate limit por IP/correo; password ≥10 con letra y número
- **Recuperar contraseña** por correo (`/recuperar`, token 30 min, un solo uso)
- **2FA por correo** (opcional en Cuenta): tras password, código de 6 dígitos
- Cabeceras: CSP, `X-Frame-Options`, `nosniff`; POSTs validan `Origin` vs `APP_ORIGIN`
- Canje de cupón atómico (`points >= costo`)

## PWA (requisitos)

| Característica | En TraGo |
|----------------|----------|
| Instalación directa | Manifest + banner Instalar (sin tienda) |
| Sin conexión | Service worker precachea shell (`/`, `/promos`, iconos); APIs van a red |
| Notificaciones push | Cumpleaños (VAPID) + permiso opt-in |
| Actualización automática | `skipWaiting` + navegación siempre a red |
| HTTPS | Obligatorio en producción (Netlify / hosting) |

## Rutas

| Ruta | Uso |
|------|-----|
| `/` | Cerca de ti (GPS; si lo niegas, Centro Histórico GDL y se etiqueta) |
| `/promos` | Catálogo vigente (público) |
| `/promos/[slug]` | Sucursales + votos de vigencia (GPS a ~400 m) |
| `/nocturno` | 19:00–06:00 y sucursal abierta |
| `/cumple` | Promos y regalos de cumpleaños |
| `/cadenas` | Perfiles de empresa |
| `/sucursales/[slug]` | Promos de un local |
| `/panel` | Operador / dueño de cadena |
| `/empresa/registro` | Alta de cadena para publicar ofertas |
| `/api/cerca` | Promos cerca (`$geoNear` / fallback Haversine) |
| `/api/opiniones` | Experiencia en sucursal + puntos |
| `/api/recompensas` | Saldo y canje de cupones |
| `/api/push/subscribe` | Suscripción Web Push (cuenta 18+) |
| `/api/push/birthday` | Dispara avisos de cumple (panel o `CRON_SECRET`) |
| `/api/cadenas/la-europea/promos` | API Premium (`x-api-key` si hay `TRAGO_API_KEY`) |

## Planes

| Plan | Anuncios | Destacadas | API |
|------|----------|------------|-----|
| Freemium | Sí | No | No |
| Pro | No | Sí | No |
| Premium | No | Sí | Sí |

## Pitch comercial

- Markdown: [`docs/PITCH-TRAGO.md`](docs/PITCH-TRAGO.md)
- Word: [`docs/TraGo-Pitch-Comercial.docx`](docs/TraGo-Pitch-Comercial.docx)

## Arrancar

### Docker (recomendado)

```bash
cd PW/trago
docker compose up --build
```

[http://localhost:3000](http://localhost:3000)

```bash
docker compose down
```

### Local (npm)

```bash
cd PW/trago
npm run dev
```

Chrome pedirá ubicación.

## Datos

Tiendas **reales de Guadalajara / Zapopan** (La Europea Andares y Chapalita, OXXO Chapultepec, Karne Garibaldi, Italianni's Centro Magno, VIPS Plaza del Sol, El Gallo Altanero, Las 9 Esquinas, Starbucks Chapultepec). El GPS ordena por distancia; si lo niegas, usa el Centro de GDL **sin fingir que estás ahí**.

Para votar vigencia hay que estar a ~400 m del local (`NEXT_PUBLIC_TRAGO_PRESENCE_MAX_KM`). En el piloto desde casa puedes subir el radio, p. ej. `25`.

Folios de promo **de demostración** (aún no hay API de las cadenas). El prototipo no afirma que el 2x1 esté vigente en caja.

```bash
npm test
```

### Web Push (cumpleaños)

```bash
npx web-push generate-vapid-keys
```

Copia la clave pública a `VAPID_PUBLIC_KEY` y `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, la privada a `VAPID_PRIVATE_KEY`, y un `VAPID_SUBJECT=mailto:...`. El usuario activa el aviso en Cuenta/Cumple; el panel o un cron con `CRON_SECRET` llama a `POST /api/push/birthday`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind 4 · MongoDB · PWA · Web Push
