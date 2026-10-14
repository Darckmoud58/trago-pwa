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
