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
| [docs/claude-project/](docs/claude-project/) | Instrucciones Claude.ai · pega `PROMPT-SIGUIENTE.md` |
| [docs/claude-project/ESTADO-ACTUAL.md](docs/claude-project/ESTADO-ACTUAL.md) | Qué ya está en PRs #2–#8 y huecos del pitch |

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

**Hecho en PRs #2–#8 (cadena draft):** auth cadena, vínculo promo↔sucursal, voto+moderación, métrica norte, gate 18+ server, mapa vigencia, scrapers en job.

**Siguiente (ver `docs/claude-project/ESTADO-ACTUAL.md`):**

1. Merge/estabilizar la cadena de PRs a `main` y demo a 1 cadena real.
2. Carga masiva de sucursales (CSV/Excel) para onboarding piloto.
3. Planes Freemium/Pro (destacada cerca + reportes) sin inventar billing completo.
4. Cupones/canjes (modelos ya existen; falta API+UI).
5. Observabilidad del embudo norte para venta Pro.

Métrica norte: **sesiones con GPS × promo abierta × sucursal vista**.
| Claude.ai Project | [`docs/claude-project/`](docs/claude-project/) — pega `PROMPT-SIGUIENTE.md` |