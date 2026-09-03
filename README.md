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

Si se acumulan reportes en contra, la promo pasa a **en duda** o se oculta en ese local. La empresa no pierde el control de lo oficial; la calle corrige el piso.

## PWA

Instalable en el teléfono (standalone). Service worker en `/sw.js`, manifest generado por Next.

## Rutas

| Ruta | Uso |
|------|-----|
| `/` | Cerca de ti (GPS; fallback Centro CDMX) |
| `/promos` | Catálogo vigente |
| `/promos/[slug]` | Sucursales + votos de vigencia |
| `/nocturno` | Solo de 19:00 a 06:00 (hora México) |
| `/cumple` | Promos y regalos de cumpleaños |
| `/cadenas` | Perfiles de empresa |
| `/sucursales/[slug]` | Promos de un local |
| `/api/cadenas/la-europea/promos` | API Premium |

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
cd GK/trago
docker compose up --build
```

[http://localhost:3000](http://localhost:3000)

```bash
docker compose down
```

### Local (npm)

```bash
cd GK/trago
npm run dev
```

Chrome pedirá ubicación.

## Datos

Tiendas **reales de Guadalajara / Zapopan** (La Europea Andares y Chapalita, OXXO Chapultepec, Karne Garibaldi, Italianni's Centro Magno, VIPS Plaza del Sol, El Gallo Altanero, Las 9 Esquinas, Starbucks Chapultepec). El GPS ordena por distancia; si lo niegas, usa el Centro de GDL.

Folios de promo **de demostración** (aún no hay API de las cadenas). El prototipo no afirma que el 2x1 esté vigente en caja.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind 4 · MongoDB · PWA
