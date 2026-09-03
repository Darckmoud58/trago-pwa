# TraGo

PWA de **promociones vigentes de cadenas** en **Guadalajara**: comida, café, alcohol y regalos de cumpleaños. Vigencia **por sucursal** y **GPS**.

> Contenido de alcohol: 18+.

## Qué resuelve

No basta con “hay 2x1 en la cadena”. TraGo responde: **¿en esta sucursal, ahora, todavía aplica?**

### Modelo híbrido (lo que Lalo dejó abierto)

| Quién | Qué hace |
|--------|----------|
| **Cadena** | Publica la promo, fechas y sucursales participantes |
| **Usuario** | Reporta *sigue vigente* o *ya no aplica* en esa sucursal |

Si se acumulan reportes **recientes** (14 días) en contra, la promo pasa a **en duda** o se oculta en ese local. El voto exige GPS cerca de la sucursal.

## PWA

Instalable en el teléfono (standalone). Service worker en `/sw.js`: precache del shell, no cachea `/api/*`, navegación siempre a red.

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
| `/panel` | Operador de cadena (`CHAIN_PANEL_EMAILS`) |
| `/api/cerca` | Promos cerca (`$geoNear` / fallback Haversine) |
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
