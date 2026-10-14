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

## Identidad (B1 / B3 Excel)

| Token | Hex | Uso |
|-------|-----|-----|
| Rojo | `#D81A1C` | CTA, labels, acentos |
| Tinto | `#3B0B13` | Fondo / marca |
| Beige | `#F7E5B5` | Texto y superficies claras |

Legal en footer: `/terminos` y `/aviso-de-privacidad` · cuenta 13+ · alcohol 18+.


Misma Atlas de clase que Todo_pwa (`BackPWA`), base propia **`trago`**.

Colecciones ER: `usuarios`, `roles`, `niveles`, `insignias`, `usuario_insignias`, `empresas`, `ubicaciones`, `categorias`, `promociones`, `cupones`, `canjes`, `resenas`, `promo_ubicaciones`.

```bash
cd server
# .env con MONGODB_URI (Atlas) + MONGODB_DB=trago
npm run seed
```

## Legacy Next

El monolitico Next quedó en `web_next_legacy/` solo como referencia. El flujo de clase es **Vite + Express**, como Todo_pwa.

## Stack

**trago_web:** Vite · React 19 · TypeScript · axios · React Router  
**server:** Express 5 · Mongoose · JWT · CORS

## Recolección de promociones cercanas

`GET /api/sucursales/cerca?lng=...&lat=...&maxMeters=8000` consulta lugares registrados en OpenStreetMap alrededor de las coordenadas recibidas: bares y sitios de comida hasta el radio solicitado, además de tiendas dentro de 2 km para mantener la consulta rápida. La pantalla **Cerca** obtiene el GPS del navegador; si falla, informa el problema y permite abrir explícitamente la zona Demo Centro GDL. No reemplaza la ubicación fallida con Guadalajara sin avisar. Los resultados se cachean 15 minutos y no se agregan al catálogo permanente de sucursales. La cobertura depende de los negocios registrados en OpenStreetMap y no garantiza encontrar todos los establecimientos. Los resultados muestran atribución y enlace de OpenStreetMap.

`GET /api/promociones/cerca?lng=...&lat=...&maxMeters=8000` descubre primero lugares en el radio. Solo cuando un lugar se puede asociar con una empresa conocida consulta sus páginas oficiales configuradas e importa resultados en MongoDB (`origen: oficial`, `url_fuente`). Muestra sucursales OSM cercanas de esa empresa; la página oficial puede no especificar en cuál sucursal aplica.

El catálogo público (`GET /api/promociones`) y el detalle solo muestran promociones con `origen: oficial` tomadas de sitios oficiales. **El listado lee solo Mongo**; los scrapers corren en un job al arrancar la API y cada 6 h (`server/src/services/officialPromoJob.js`), no en cada request. Fuentes con parsers en `server/src/services/officialPromoCollector.js`: OXXO, 7‑Eleven (ofertas Jalisco), Chedraui (API VTEX), Burger King (GraphQL loyalty), Starbucks, Krispy Kreme, Italianni’s, Vips, Walmart (campañas Tempo), Circle K, HEB y La Europea. McDonald’s y Soriana suelen bloquear scrapers (Cloudflare/PerimeterX); si no hay lectura legible no se inventan ofertas. La extracción es aproximada y no confirma inventario ni aplicación en sucursal.

## Voto de vigencia en piso

`POST /api/reportes` (JWT) con `{ promoId, ubicacionId, stillValid, lat, lng }` exige estar a ≤400 m de la sucursal. Actualiza contadores en `promo_ubicaciones` y nunca toca `activa_oficial`. `GET /api/reportes?promoId=&ubicacionId=` devuelve el voto propio. En el detalle de promo, cada sucursal ligada muestra “Sigue vigente” / “Ya no aplica”.

## Promo ↔ sucursales (sin inventar)

- Vínculos solo en `promo_ubicaciones` (`origen_vinculo`: `empresa` | `fuente` | `manual`).
- Scrapers **no** asignan todas las tiendas de la marca: solo si el texto oficial nombra una sucursal ya conocida.
- `GET /api/promociones/:id` devuelve `sucursalesParticipantes` + `vinculoSucursales` (mensaje claro si la fuente no especifica). Query opcional `?lat=&lng=` para distancia.
- En **Cerca**, `ubicacionesCercanas` OSM son candidatas (`participacionConfirmada: false`), no participantes.

## Moderación de reportes (#5)

- Límites: 12/h, 30/día, máx 3 flip-flops/24 h; ráfaga en memoria; ban temporal `reportes_bloqueado_hasta`.
- El voto **matiza** (`en_duda` / `caduco`); **nunca** borra el folio.
- Cadena: `GET /api/cadena/vigencia`, `POST .../reafirmar`, `POST .../participacion` (pausar sucursal).
- Admin: `POST /api/cadena/admin/bloquear-reportes` `{ userId, hours }`.
- UI: sección “Vigencia por sucursal” en `/cadena`.

## Panel de cadena (`/cadena`)

- `POST /api/cadena/registro` — crea empresa + rol `empresa` (devuelve JWT nuevo).
- `GET /api/cadena/me` — empresa, promos y sucursales del dueño.
- `POST /api/cadena/sucursales` · `POST /api/cadena/promociones` · `PUT /api/cadena/promociones/:id`.
- Promos con `origen: empresa`; **sin sucursales = borrador**; catálogo público solo si la cadena está `verificada` (admin: `POST /api/cadena/admin/verificar`).
- Seed demo: `cadena@trago.app` / `TraGo123!`. Auto-verificar altas: `TRAGO_AUTO_VERIFY_CHAIN=true`.

## Favoritos de usuario y modo offline

Los favoritos autenticados se guardan en MongoDB en `favoritos`, separados por `userId` y protegidos por JWT. `GET /api/favoritos` lista, `PUT /api/favoritos/:type/:targetId` crea/actualiza, `DELETE /api/favoritos/:type/:targetId` elimina y `POST /api/favoritos/sync` aplica cambios pendientes. El frontend mantiene un espejo por cuenta en IndexedDB y una cola de cambios; al recuperar conexión sincroniza altas y bajas. Los visitantes sin sesión conservan favoritos locales anónimos, sin subirlos a una cuenta automáticamente.
