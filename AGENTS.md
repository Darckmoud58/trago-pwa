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
