# TraGo — contexto completo para Claude.ai

Repo GitHub: https://github.com/Darckmoud58/trago-pwa
Rama con este contexto: cursor/contexto-persistente-trago-e557
PR: https://github.com/darckmoud58/trago-pwa/pull/1

---

# TraGo — instrucciones del proyecto (Claude.ai)

Eres el copiloto del producto **TraGo**. En cada sesión aplica esta visión sin que te la vuelvan a pegar.

## Tesis

TraGo vende **certeza**: qué promo sigue vigente, en cuál local, a cuántos metros.

**Fórmula:** `promo oficial × sucursales participantes × GPS × verdad de piso (voto de vigencia)`.

## Dual market

- **Demanda (usuario PWA):** cazador de promo, grupo que sale, comprador de destilado. Promesa: no te muevas de balde.
- **Oferta (cadena / marca):** aparecer cerca con vigencia real; no clics huecos.
- **No es:** directorio de lugares, delivery, feed social, marketplace de alcohol. La promo es el producto.

## Stack (código real)

- Front: `trago_web/` — Vite + React + TypeScript + axios + React Router (PWA).
- API: `server/` — Express + Mongoose + JWT. Puerto 4000.
- DB: MongoDB Atlas, nombre `trago`.
- Legacy Next solo referencia: `web_next_legacy/`. No revivir Next como app principal.
- Ciudad ancla en código: **Guadalajara**. El pitch comercial puede hablar CDMX.

## Reglas al diseñar o proponer código

1. Catálogo público solo con `origen: oficial`. Si no hay lectura legible de la fuente, **no inventes** ofertas.
2. GPS fallido: informar el problema y permitir demo explícito (Centro GDL). Nunca sustituir ubicación en silencio.
3. Alcohol: información de promo, copy/gate **18+**. No vender alcohol.
4. El voto de vigencia **matiza** la sucursal; no borra el folio oficial de la cadena.
5. Métrica norte: **sesiones con GPS × promo abierta × sucursal vista** (no likes).
6. Prioriza piloto cobrable: auth de cadena, alta de promos/sucursales, moderación de reportes, panel de vigencia por local.

## Anti-patrones

- Convertir TraGo en “lugares bonitos” o scraper genérico.
- Inventar inventario, precios o sucursal de aplicación.
- Priorizar engagement vacío sobre pies en la puerta.

## Fuentes del proyecto (archivos subidos)

Cuando existan en Archivos del proyecto, úsalos como verdad:

- `PITCH-TRAGO.md` — tesis comercial, GTM, ingresos.
- `AGENTS.md` — guía corta para agentes.
- `README.md` — arranque, rutas, OSM/cerca, scrapers.
- `GUIA_MONGODB_TRAGO.txt` — colecciones y seed.
- `CLAUDE.md` — mapa del repo para trabajo con carpeta local.

Si el usuario pide implementación en el repo: da cambios concretos por archivos (`trago_web/…`, `server/…`) alineados al stack. Si solo hay chat en Claude.ai sin carpeta, entrega diffs/pasos claros para pegar en Cursor o Claude Code.

---

# TraGo — guía para agentes

## Visión (5 bullets)

- **Certeza local:** qué promo sigue vigente, en cuál sucursal, a cuántos metros.
- **Fórmula:** promo oficial × sucursales × GPS × voto de vigencia en piso.
- **Dual market:** usuario (no viaje en vano) + cadena/marca (pies en la puerta, no likes).
- **PWA:** Vite (`trago_web/`) + Express (`server/`) + MongoDB Atlas DB `trago`.
- **Límites:** 18+ alcohol (solo info de promo); no inventar ofertas; no directorio genérico.

## Fuentes

| Doc | Para qué |
|-----|----------|
| [docs/PITCH-TRAGO.md](docs/PITCH-TRAGO.md) | Tesis comercial, GTM, ingresos, riesgos |
| [README.md](README.md) | Stack, rutas, OSM/cerca, scrapers oficiales, favoritos |
| [GUIA_MONGODB_TRAGO.txt](GUIA_MONGODB_TRAGO.txt) | Colecciones y seed |
| [.cursor/rules/trago-vision.mdc](.cursor/rules/trago-vision.mdc) | Regla siempre activa |
| [CLAUDE.md](CLAUDE.md) | Mapa del repo para Claude Code (carpeta local) |
| [docs/claude-project/](docs/claude-project/) | Instrucciones + guía para proyecto Claude.ai |

## Arranque

```bash
# API :4000
cd server && npm install && npm start

# Front :5173
cd trago_web && npm install && npm run dev
```

`VITE_API_URL=http://localhost:4000` · `.env` en `server/` con `MONGODB_URI` y `MONGODB_DB=trago`.

## Colecciones clave

`usuarios`, `roles`, `empresas`, `ubicaciones`, `categorias`, `promociones`, `promo_ubicaciones`, `cupones`, `canjes`, `resenas`, `favoritos`, insignias/niveles.

## Prioridades MVP → piloto cobrable

1. Auth de cadena + alta de promos / sucursales (dejar de depender solo de mock/scrape).
2. Persistencia real (Postgres o Mongo ya en uso) y catálogo solo oficial.
3. Moderación de reportes de vigencia (anti-abuso; el voto matiza, no borra el folio).
4. Panel: mapa de vigencia por local.
5. Gate 18+ / geocerca alcohol + términos / aviso de privacidad.

Métrica norte: **sesiones con GPS × promo abierta × sucursal vista**.

---

# TraGo — contexto para Claude Code

Al trabajar en esta carpeta, lee primero:

1. `docs/claude-project/INSTRUCCIONES.md` — visión y reglas de producto
2. `AGENTS.md` — prioridades y arranque
3. `docs/PITCH-TRAGO.md` — tesis comercial
4. `README.md` — stack y APIs existentes

## Qué es TraGo

PWA de **promociones vigentes** por cadena, sucursal y GPS. Vende certeza local (oficial × local × vivo), no directorio ni delivery. Alcohol: solo información de promo, 18+.

## Mapa del repo

```
trago/
├── trago_web/          # Vite + React 19 + TS — PWA :5173
├── server/             # Express + Mongoose + JWT — API :4000
├── docs/               # Pitch, ER, logos, paquete Claude
├── web_next_legacy/    # Solo referencia — no es la app principal
├── AGENTS.md
├── CLAUDE.md           # este archivo
└── .cursor/rules/      # reglas Cursor (misma visión)
```

## Arranque

```bash
cd server && npm install && npm start          # :4000
cd trago_web && npm install && npm run dev     # :5173
```

`VITE_API_URL=http://localhost:4000`. En `server/.env`: `MONGODB_URI`, `MONGODB_DB=trago`.

## Prioridades de construcción

1. Auth de cadena + alta de promos / sucursales  
2. Catálogo solo oficial / no inventar ofertas  
3. Moderación de reportes de vigencia  
4. Panel mapa de vigencia por local  
5. Gate 18+ y legal  

Métrica norte: GPS × promo abierta × sucursal vista.

## Convenciones

- Front en `trago_web/src/` (pages, components, api.ts).
- API en `server/src/` (routes, controllers, models, services).
- Identidad: rojo `#D81A1C`, tinto `#3B0B13`, beige `#F7E5B5`.
- No sustituir GPS fallido sin aviso. No inventar promos si el scraper no lee.

---

# TraGo
## La promo que sí está viva — en la sucursal de a lado

**Documento comercial · confidencial**  
PWA de promociones vigentes por cadena, sucursal y geolocalización  
México · 18+ cuando hay alcohol  
Septiembre 2026

---

### Una frase

Hoy las cadenas publican promociones. Mañana el cliente llega a la sucursal y ya no aplican. **TraGo vende certeza:** qué promo sigue vigente, en cuál local, a cuántos metros.

---

## 1. El problema (lo que duele de verdad)

México está lleno de “2x1”, “3x2 en botella” y “cover + mixto”. El anuncio vive en Instagram, en el volante de la cadena o en el sitio corporativo. **La vigencia vive en el piso** — y el piso no es uniforme.

Tres fallas que se repiten cada noche:

1. **La promo es de la cadena, no del local.** Polanco sí; Condesa ya se acabó. El usuario no tiene cómo saberlo sin ir.
2. **El contenido caduca y nadie lo baja.** El post de hace 12 días sigue likeable. El cliente se mueve. El negocio pierde la venta y gana un comentario malo.
3. **Quien paga publicidad compra clics, no pies en la puerta.** Una cadena gasta en “estamos en promo” y convierte mal porque el 30–50% de sucursales ya no participa, se les acabó el inventario o el gerente no activó el folio.

Eso no es un problema de “más catálogo”. Es un problema de **verdad local y a tiempo**.

### El costo, en claro

| Actor | Qué pierde hoy |
|--------|----------------|
| Usuario | Tiempo, pasaje, la noche, confianza |
| Cadena / sucursal | Visita frustrada, mala reseña, inventario mal empujado |
| Marca ( destilado, cerveza) | Trade spend sin prueba de que la botella se movió *en ese* local |
| Medio / app genérica | Engagement hueco: promociones “nacionales” que mienten en la esquina |

**Insight:** el ticket nocturno (botella, mesa, six) es alto. El arrepentimiento también. Quien resuelva “¿sí o no, aquí y ahora?” se queda con la intención de compra más cara del retail de conveniencia y de la vida nocturna.

---

## 2. A quién va dirigido

TraGo no es “para todo el que sale”. Tiene **dos caras que se alimentan**.

### A. Consumidor (demanda) — el que abre la PWA

| Perfil | Qué busca | Por qué TraGo |
|--------|-----------|---------------|
| **Cazador de promo 18–35** | 2x1, six, michelada, botella barata esta noche | GPS + vigencia por sucursal, no un feed infinito |
| **Grupo que sale** | Cover + botella, rooftop, antro | Decide en 30 segundos si vale el Uber |
| **Comprador de destilado** | 3x2 mezcal / 20% whisky en licorería | Ve si *esa* Cava / Vinoteca todavía lo tiene |

Promesa al usuario: *no te muevas de balde.*

Instalable en el teléfono (PWA). Sin App Store el día uno.

### B. Cadena y marca (oferta) — quien paga

| Perfil | Dolor | Qué le vendemos |
|--------|-------|-----------------|
| **Cadena de conveniencia** (Paso Rápido / formato Oxxo) | Promo nacional que no pega igual en 200 tiendas | Publicar por sucursal; ver dónde la gente confirma o niega |
| **Licorería / cava** | Inventario de botella caro y fechas cortas | Empujar 3x2 solo donde hay stock y tráfico |
| **Grupo de antros / cantinas** | Cover y botella que cambian jueves vs sábado | Destacar “cerca de ti” en horario nocturno |
| **Marca de alcohol** (Heineken, Cuervo, Johnnie) | Paga exhibición y no sabe si el local cumplió | Promo patrocinada + señal de vigencia en piso |

**No es el cliente primario:** el directorio de “lugares bonitos” (eso ya lo hace Google / Instagram). TraGo gana si **la promo es el producto**.

### C. Quién no es

- Menores de 18 (alcohol).
- Cadenas que no pueden (o no quieren) decir *en qué sucursales* aplica.
- Un marketplace de delivery: no competimos con Rappi; competimos con el **viaje en vano**.

---

## 3. La solución

**TraGo = promo oficial de la cadena × sucursales participantes × GPS × verdad de la calle.**

1. La empresa **publica** la promo: fechas, tipo (2x1, botella, cover, happy hour), términos, sucursales.
2. El usuario **ve las que están vigentes cerca**.
3. Entra al detalle y ve **en cuáles locales sigue viva**.
4. En el piso, **confirma o niega**: “sigue vigente” / “ya no aplica”.
5. Si se acumulan reportes en contra, esa sucursal pasa a *en duda* o se oculta. La cadena no pierde el control de lo oficial; **el piso corrige el folleto**.

Eso cierra la pregunta que Lalo dejó abierta: no es *o* la empresa *o* el usuario. **Las dos capas.** Sin la empresa no hay oferta legal ni marca. Sin el usuario, la vigencia es un PDF.

### Por qué PWA (y no app nativa el día uno)

- Se instala desde el navegador. Menos fricción que App Store / Play.
- Geolocalización y “agregar a inicio” bastan para el hábito de “¿a dónde vamos?”.
- Un solo código (Next.js) para web y “app”.
- Cuando haya tracción: wrappers nativos. No antes.

---

## 4. Por qué es vendible y rentable

El dinero no está en el usuario gratuito. Está en **quien necesita que esa sucursal se llene esta noche**.

### Motivos para pagar (cadena / marca)

1. **Aparecer primero en “Cerca de ti”** cuando hay intención real (GPS + horario nocturno).
2. **Dejar de quemar presupuesto** en sucursales donde la promo ya murió.
3. **Prueba social de piso:** N personas dijeron “sigue vigente” en Reforma vs 0 en Del Valle.
4. **API** para meter TraGo en su app, letrero digital o CRM (plan Premium).
5. **Marcas de alcohol:** pauta nativa sobre la promo de botella, no un banner genérico.

### Modelo de ingresos (Freemium que sí cierra)

| Plan | Quién | Qué incluye | Precio de lista sugerido* |
|------|--------|-------------|---------------------------|
| **Freemium** | Cadena chica / cantina | Perfil + 2 promos activas + anuncios de terceros | $0 |
| **Pro** | Cadena con 3+ sucursales | Sin anuncios propios, **destacada cerca de ti**, reportes de vigencia | $2,900 – $6,900 MXN / mes por zona (CDMX, MTY, GDL) |
| **Premium** | Grupo / marca | API, sucursales ilimitadas, white-label light, export | $12,000 – $25,000 MXN / mes |
| **Campaña de marca** | Destilado / cerveza | Promo patrocinada 7–15 días, slot nocturno | $15,000 – $80,000 por vuelo |
| **Pauta Freemium** | Anunciantes locales | Banner en perfiles free | CPM / CPC local |

\*Lista para vender la idea, no un SAP. Se ajusta con piloto.

### Unidad económica (piloto CDMX, conservador)

Supuesto de 12 meses, ciudad ancla:

| Palanca | Año 1 (orden de magnitud) |
|---------|----------------------------|
| 40 cadenas Pro × $4,000/mes promedio | ~$1.9 M MXN |
| 8 Premium × $15,000/mes | ~$1.4 M MXN |
| 6 vuelos de marca / trimestre | ~$1.2 – $2.0 M MXN |
| Pauta Freemium | $0.3 M MXN |
| **Ingreso bruto indicativo** | **$4.8 – $5.6 M MXN** |
| Costo (2–3 personas + infra + ads de adquisición) | $2.5 – $3.2 M MXN |
| **Margen de contribución** | Positivo si el piloto cierra 25+ Pro en 6 meses |

No hace falta ser “el Uber de las promos”. Hace falta **ser el sistema de verdad** de 40 cadenas que ya gastan en volante, pauta y trade.

### Por qué el margen aguanta

- Software, no inventario.
- PWA: cero comisión de tienda al inicio.
- El contenido lo ponen las cadenas; los usuarios lo curan. CAC de oferta bajo si el primer grupo (licorerías + antros) ve visitas medibles.
- Upsell natural: Freemium → Pro en cuanto la sucursal vecina les quite el clic.

---

## 5. Competencia y cuña

| Alternativa | Qué hace | Dónde falla vs TraGo |
|-------------|----------|----------------------|
| Instagram / TikTok | Alcance | No hay vigencia por sucursal ni GPS de “aún aplica” |
| Google Maps | Dónde está el local | No es un sistema de promos; el post se pudre |
| Clubes de lealtad de cadena | Descuento propio | Silo: no comparas Cava vs antro vs tienda |
| Rappi / PedidosYa | Entrega | Otro job: “me lo traen”, no “¿voy o no?” |
| Grupos de Facebook “promos CDMX” | Ruido social | Sin oficialidad, sin mapa, sin API |

**Cuña:** *oficial + local + vivo*. Nadie serio junta las tres.

---

## 6. Go-to-market (cómo se llena el dual market)

Orden que sí se puede ejecutar:

1. **Oferta primero (10–15 cadenas CDMX).** Licorerías, 1 grupo de antros, 1 formato conveniencia. Ellos cargan promos reales aunque el MVP hoy sea mock.
2. **Demanda en corredores.** Roma–Condesa–Reforma–Polanco. Una PWA, un mensaje: “botella y 2x1 que todavía sirven”.
3. **Prueba al gerente.** Screenshot: “12 personas confirmaron vigencia anoche en esta sucursal; 9 dijeron que en la otra ya no.” Eso vende el plan Pro.
4. **Marcas en vuelo 2.** Cuando haya 20+ sucursales con tráfico, se cotiza Johnnie / mezcal de casa / cerveza.

Métrica norte: **sesiones con GPS × promo abierta × sucursal vista**. No “likes”.

---

## 7. Producto (lo que ya existe vs lo que se vende después)

### Hoy (MVP)

- Home con geolocalización (fallback Centro CDMX).
- Promos vigentes, filtro por tipo.
- Detalle: sucursales + voto de vigencia.
- Capa **Nocturno** (botellas, cover, 2x1).
- Perfiles de cadena (Freemium / Pro / Premium + API de ejemplo).
- PWA instalable.

### 90 días (para cobrar)

- Login de cadena y alta de promos / sucursales.
- Base de datos (no mock).
- Moderación de reportes (anti-abuso).
- Panel: mapa de vigencia por local.
- Aviso 18+ y geocerca de alcohol.

### 12 meses

- Reservación / cover (take rate).
- Push: “tu 3x2 de mezcal caduca en 4 horas a 800 m”.
- Expansión MTY / GDL con el mismo playbook.

---

## 8. Riesgos (y cómo se contestan en una mesa)

| Riesgo | Respuesta |
|--------|-----------|
| “Los usuarios van a trollar la vigencia” | Umbral + cuenta + que la cadena pueda reafirmar oficial. El voto no borra el folio: lo matiza. |
| “Las cadenas no van a cargar sucursal por sucursal” | Excel / API / “aplicar a todas excepto…” En piloto lo cargamos nosotros. |
| “Alcohol, legal, 18+” | PWA con gate, copy 18+, no venta de alcohol: **información de promo**. Aviso de privacidad y términos desde el piloto. |
| “Google ya está” | Google no cobra ni opera vigencia de 2x1 por folio de sucursal. Ese es el hueco. |
| “¿Y si Lalo quería solo usuarios o solo empresas?” | El híbrido es la tesis: sin empresa no hay negocio B2B; sin usuario no hay verdad. Se valida en 4 semanas de piloto. |

---

## 9. La conversación de venta (60 segundos)

> Las cadenas ya pagan por decir “tenemos promo”. El cliente llega y en la mitad de las sucursales no es cierto. TraGo es la capa que responde *sí o no, aquí, ahora*, con GPS, y deja que la gente en piso confirme. Cobramos a la cadena por aparecer cerca y por no lucir sucursales muertas. Al usuario le damos la noche sin viaje en vano. Es PWA, se instala ya, y el piloto en CDMX se mide en pies en la puerta — no en likes.

---

## 10. Pedido (qué se necesita para el siguiente paso)

Para pasar de demo a **piloto cobrable**:

1. 8–12 cadenas ancla en CDMX (aunque sea 1 sucursal cada una).
2. Una persona de contenido / onboarding 4 semanas.
3. Auth + Postgres (el contenedor Docker ya levanta el front).
4. Decisión de precio Pro de lista ($2,900 vs $4,900) según si se vende por *cadena* o por *zona*.

**Cierre:** TraGo no pide que el mercado “descubra las salidas”. Pide que deje de mentir la distancia entre el anuncio y la caja.

---

*TraGo · Documento de tesis comercial · uso interno y presentaciones a socios*  
*Cifras de ingreso son escenarios de lista, no un forecast auditado.*

---

# TraGo

PWA / app de **promociones vigentes** en Guadalajara.

TraGo vende **certeza**: qué promo sigue vigente, en cuál sucursal y a cuántos metros — oficial × local × GPS × verdad de piso. No es directorio ni delivery; la promo es el producto. Tesis comercial y go-to-market: [docs/PITCH-TRAGO.md](docs/PITCH-TRAGO.md). Contexto para agentes: [AGENTS.md](AGENTS.md). Claude.ai / Claude Code: [docs/claude-project/COMO-CONECTAR.md](docs/claude-project/COMO-CONECTAR.md) y [CLAUDE.md](CLAUDE.md).

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

El catálogo público (`GET /api/promociones`) y el detalle solo muestran promociones con `origen: oficial` tomadas de sitios oficiales. Fuentes con parsers en `server/src/services/officialPromoCollector.js`: OXXO, 7‑Eleven (ofertas Jalisco), Chedraui (API VTEX), Burger King (GraphQL loyalty), Starbucks, Krispy Kreme, Italianni’s, Vips, Walmart (campañas Tempo), Circle K, HEB y La Europea. McDonald’s y Soriana suelen bloquear scrapers (Cloudflare/PerimeterX); si no hay lectura legible no se inventan ofertas. Se cachean por proceso durante seis horas. La extracción es aproximada y no confirma inventario ni aplicación en sucursal.

## Favoritos de usuario y modo offline

Los favoritos autenticados se guardan en MongoDB en `favoritos`, separados por `userId` y protegidos por JWT. `GET /api/favoritos` lista, `PUT /api/favoritos/:type/:targetId` crea/actualiza, `DELETE /api/favoritos/:type/:targetId` elimina y `POST /api/favoritos/sync` aplica cambios pendientes. El frontend mantiene un espejo por cuenta en IndexedDB y una cola de cambios; al recuperar conexión sincroniza altas y bajas. Los visitantes sin sesión conservan favoritos locales anónimos, sin subirlos a una cuenta automáticamente.

---

================================================================================
TraGo — Guía de base de datos MongoDB (alineada con clase PWA + equipo BD)
Para el compañero de BD
================================================================================

DB name:  trago
Stack:    MongoDB Atlas (o local) + Mongoose models en PW/trago/server
          (mismo patrón que Todo_pwa/server: models / controllers / routes)
PWA Next: usa las MISMAS colecciones vía src/lib/collections.ts


1. INFRA ATLAS
--------------------------------------------------------------------------------
1) Cluster free (M0)
2) Database User
3) Network Access → 0.0.0.0/0
4) URI:

   mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/trago?retryWrites=true&w=majority

Env:
   MONGODB_URI = URI de arriba
   MONGODB_DB  = trago

NO hace falta crear colecciones a mano: al abrir la PWA o al correr la API,
se crean índices + seed (roles, categorías, niveles, insignias, fuentes,
negocios, sucursales, promociones, promoSucursales, suscripciones).


2. COLECCIONES (las que identificó el equipo + extras por objetivo TraGo)
--------------------------------------------------------------------------------
Colección              | Para qué
-----------------------+--------------------------------------------------------
usuarios               | Cuentas (correo/Google, edad teen/adult, puntos, 2FA)
roles                  | user | chain | admin + permisos
categorias             | Tipos de venue y de promo (bar, 2x1, cumple…)
negocios               | Cadenas / empresas (antes "chains")
sucursales             | Locales con GPS 2dsphere (antes "branches")
promociones            | Ofertas vigentes (antes "promos")
fuentesPromociones     | official | chain | user | demo
cupones                | Canjes por puntos
favoritos              | Promo / sucursal / negocio favorito del usuario
resenas                | Opiniones en sucursal (+ puntos si GPS cerca)
reportes               | Votos "sigue / ya no" por promo+sucursal
niveles                | Gamificación por puntos (Novato → Leyenda GDL)
detallesPuntos         | Ledger anti-farmeo (antes "pointLedger")
insignias              | Catálogo de badges
usuarioInsignias       | Insignias ganadas por usuario
referidos              | Códigos de invitación
suscripcionesNegocio   | Plan free / pro / premium del negocio
pagosSuscripcion       | Pagos de la suscripción (sub)
notificaciones         | In-app / push / email / cumple
promoSucursales        | Promo ↔ sucursal + contadores vigencia (NÚCLEO GPS)
authLocks              | Bloqueo login (seguridad)
passwordResets         | Tokens recuperar clave
twoFactorChallenges    | Códigos 2FA
pushSubs               | Suscripciones Web Push
meta                   | Versión de catálogo (_id: "catalog")


3. CAMPOS PRINCIPALES (por colección)
--------------------------------------------------------------------------------

--- roles ---
code: "user"|"chain"|"admin"
name, description, permissions[], active

--- categorias ---
code, name
scope: "venue"|"promo"
alcoholAllowed, active

--- usuarios ---
email (unique), passwordHash?, googleId?
profile: { name, picture? }
age: { birthDate, yearsAtSignup, confirmed18, confirmedAt, band?: "teen"|"adult" }
role: "user"|"chain"          (legado)
roleId?, nivelId?
points?, referralCode?, referredByUserId?
twoFactorEmail?, createdAt / updatedAt

--- negocios ---
slug (unique), name, tagline, description
mark, markColor, website
tier: "free"|"pro"|"premium"
publishesPromos, hasApiAccess, showAds
ownerUserId?, categoriaId?, suscripcionId?

--- sucursales ---
slug (unique), chainId, chainName, name, kind, categoriaId?
address, colonia, city
location: { type: "Point", coordinates: [lng, lat] }   ← lng PRIMERO
hours, imageUrl, active

--- promociones ---
slug (unique), chainId, chainName, title, subtitle, kind
categoriaId?, fuenteId?
isNocturno, alcohol, audience?: "all"|"adult", isBirthday
startsAt, endsAt, terms, imageUrl
featured, isDemo, sourceUrl?, sourceLabel?
origin?: "official"|"chain"|"demo", active
Regla: alcohol:true → solo perfiles 18+ (audience adult)

--- fuentesPromociones ---
name, type: "official"|"chain"|"user"|"demo", baseUrl?, active, notes?

--- cupones ---
userId, code (unique), label, costPoints, promocionId?
redeemedAt?, expiresAt?, status?: "active"|"redeemed"|"expired"

--- favoritos ---
userId, targetType: "promocion"|"sucursal"|"negocio", targetId
unique(userId + targetType + targetId)

--- resenas ---
userId, userName, promoId, branchId, rating (1-5), text, textHash
nearStore, pointsAwarded, lat?, lng?
unique(userId + promoId + branchId)

--- reportes ---
userId, promoId, branchId, stillValid, motivo?, lat?, lng?
unique(userId + promoId + branchId)

--- niveles ---
code, name, minPoints, maxPoints?, benefits[], sortOrder
Seed: novato (0-49), explorador (50-149), local (150-399), leyenda (400+)

--- detallesPuntos ---
userId, delta, reason: vote|review|redeem|referral|badge|signup
refKey (unique anti-farmeo), meta?, createdAt

--- insignias ---
code, name, description, icon, criteria, pointsBonus, active

--- usuarioInsignias ---
userId, insigniaId, earnedAt, pointsAwarded
unique(userId + insigniaId)

--- referidos ---
referrerUserId, referredUserId?, code (unique)
status: pending|completed|rewarded, pointsAwarded, completedAt?

--- suscripcionesNegocio ---
negocioId, plan: free|pro|premium, startsAt, endsAt?, active, autoRenew

--- pagosSuscripcion ---
suscripcionId, negocioId, amount, currency (MXN)
status: pending|paid|failed|refunded
provider?, providerRef?, paidAt?

--- notificaciones ---
userId, type: push|email|in_app|birthday|promo|system
title, body, read, data?, createdAt

--- promoSucursales ---
promoId, branchId, officialActive, reportsVigente, reportsCaduco
unique(promoId + branchId)


4. ÍNDICES CRÍTICOS
--------------------------------------------------------------------------------
usuarios.email unique
usuarios.googleId unique sparse
sucursales.location 2dsphere          ← obligatorio para "cerca"
promoSucursales {promoId, branchId} unique
reportes / resenas {userId, promoId, branchId} unique
detallesPuntos.refKey unique
cupones.code unique


5. CÓMO VERIFICAR (Compass / mongosh)
--------------------------------------------------------------------------------
use trago
show collections

db.roles.countDocuments()
db.categorias.countDocuments()
db.negocios.countDocuments()
db.sucursales.countDocuments()
db.promociones.countDocuments()
db.promoSucursales.countDocuments()
db.niveles.find().sort({ sortOrder: 1 })
db.meta.findOne({ _id: "catalog" })

// Geo check
db.sucursales.findOne({}, { name: 1, location: 1 })


6. CÓDIGO DE REFERENCIA
--------------------------------------------------------------------------------
PWA (Next, driver nativo):
  src/lib/collections.ts     → nombres canónicos
  src/lib/docs.ts            → tipos / campos
  src/lib/queries.ts         → índices + seed
  src/lib/mock-data.ts       → catálogo demo GDL

API estilo profe (Express + Mongoose):
  server/src/models/*.js
  server/src/controllers/
  server/src/routes/
  server/README.md

Arranque API:
  cd PW/trago/server && cp .env.example .env && npm i && npm run dev


7. CHECKLIST COMPAÑERO BD
--------------------------------------------------------------------------------
[ ] Atlas + usuario + 0.0.0.0/0
[ ] URI con DB trago → entregar MONGODB_URI / MONGODB_DB
[ ] Abrir PWA o API una vez → seed + índices
[ ] En Compass: ver las colecciones de la sección 2
[ ] Verificar sucursales.location = Point [lng, lat]
[ ] (Opcional) Documentar ER / diccionario de datos con esta guía

NOTA MIGRACIÓN:
Si ya existían colecciones viejas (users, chains, branches, promos…),
quedan obsoletas. Las nuevas son las de la sección 2 (nombres en español).
Se puede dropear las antiguas tras confirmar el seed en las nuevas.


8. RELACIÓN CON EL OBJETIVO DEL PROYECTO
--------------------------------------------------------------------------------
Problema: ¿sigue viva la promo EN ESTA SUCURSAL ahora?
→ promoSucursales + reportes + GPS en sucursales

Público teen / adult:
→ usuarios.age.band + promociones.alcohol / audience + categorias.alcoholAllowed

Negocios pagan plan:
→ suscripcionesNegocio + pagosSuscripcion + negocios.tier

Engagement:
→ detallesPuntos + niveles + insignias + referidos + cupones + favoritos

Fuentes confiables:
→ fuentesPromociones (official / chain / user / demo)

================================================================================
Fin — Equipo TraGo / Gestión de Proyectos II + PWA
================================================================================
