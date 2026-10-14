# TraGo — backlog de mejoras (auditoría)

Fuente: stack vivo `trago_web/` + `server/`. Legacy `web_next_legacy/` = referencia.

## Ya funciona

- Auth usuario JWT, catálogo oficial + scrapers, GPS/Cerca/OSM, detalle promo, favoritos offline, PWA, legal + gate blando 18+.

## Top 10 (impacto → esfuerzo)

| # | Ítem | Impacto | Esfuerzo |
|---|------|---------|----------|
| 1 | Auth cadena + CRUD promos/sucursales + panel mínimo | Alto | Alto |
| 2 | API + UI voto vigencia (GPS; no borra folio) | Alto | Medio |
| 3 | Ligar promo oficial ↔ sucursales participantes | Alto | Medio |
| 4 | Moderación anti-abuso de reportes | Alto | Medio |
| 5 | Panel mapa vigencia por local (venta Pro) | Alto | Medio |
| 6 | Seed `demo` vs listado `oficial` + no borrar scrape | Alto | Bajo |
| 7 | Gate 18+ real + filtro alcohol server-side | Medio | Medio |
| 8 | Métrica norte: GPS × promo × sucursal | Medio | Bajo |
| 9 | Scrapers fuera del hot path (cron/cache) | Medio | Medio |
| 10 | Unificar puertos/Docker/proxy + JWT_SECRET | Medio | Bajo |

## Arreglos urgentes

1. Seed con `origen: demo` invisible en API pública.
2. `npm run seed` borra promociones oficiales.
3. `VITE_API_URL` 4000 vs 4001 inconsistente.
4. Docker front sin proxy `/api`.
5. Refresh de scrapers en cada `GET /api/promociones`.
6. Gate 18+ solo localStorage.
7. Detalle de promo a menudo sin sucursales ligadas.
8. Password demo visible en Login.
9. JWT fallback `changeme`.
10. Modelos Cupon/Canje/Resena/Insignia sin rutas.

## Prompt para Claude.ai

Ver [docs/claude-project/PROMPT-MEJORAS.md](claude-project/PROMPT-MEJORAS.md).
