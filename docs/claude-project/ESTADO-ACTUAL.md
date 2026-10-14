# TraGo — estado técnico (post PRs #2–#8)

Actualizado para Claude.ai / Claude Code. Repo: https://github.com/Darckmoud58/trago-pwa

## Cadena de PRs (draft, mergear en orden)

| PR | Rama | Qué entregó |
|----|------|-------------|
| #2 | `cursor/auth-cadena-panel-e557` | Auth cadena, CRUD promo/sucursal, panel `/cadena`, catálogo empresa verificada |
| #3 | `cursor/ligar-promo-sucursales-e557` | Vínculo promo↔sucursal sin inventar participación OSM |
| #4 | (voto / quick wins en cadena) | Scrapers a job 6h, puerto 4000 + proxy `/api`, voto vigencia 400 m |
| #5 | `cursor/moderacion-reportes-e557` | Rate limit, flip-flop, ban, reafirmar / pausar participación |
| #6 | `cursor/metrica-norte-e557` | Eventos `gps_ok` × `promo_open` × `sucursal_vista` + embudo en panel |
| #7 | `cursor/gate-18-server-e557` | Gate 18+ server (`X-Trago-Band` / JWT), diálogo edad |
| #8 | `cursor/mapa-vigencia-e557` | Mapa OSM Leaflet de vigencia en `/cadena` |

Quick wins y voto (#1) viven en la base de esa cadena.

## Ya no es “casi ausente”

- Panel cadena + alta de promos/sucursales  
- Voto de vigencia con GPS ≤400 m  
- Ligado promo↔sucursal (sin inventar)  
- Moderación anti-abuso  
- Métrica norte instrumentada  
- Gate 18+ en servidor  
- Mapa de vigencia por local  

## Huecos vs pitch (piloto cobrable)

Del `docs/PITCH-TRAGO.md` §10 y modelo de ingresos, **aún no hay** (o está solo en seed/modelo):

1. **Onboarding comercial** — Excel/CSV “aplicar a todas excepto…”, carga masiva de sucursales para piloto.
2. **Planes Freemium / Pro / Premium** — `Empresa.plan` existe; no hay paywall, destacada-cerca de pago, ni facturación.
3. **Cupones / canjes** — modelos + seed; **cero UI/API de canje** en el PWA vivo.
4. **Reseñas** — colección ER; sin flujo producto.
5. **API Premium** para CRM/letrero de la cadena.
6. **Campañas de marca** (destilado) — slot nocturno patrocinado.
7. **Ciudad piloto** — código ancla GDL; pitch habla CDMX (ok, pero falta switch ciudad / cobertura).
8. **Geocerca alcohol por jurisdicción** — gate por edad sí; no por municipio/horario legal fino.
9. **Push / recordatorio “sigue vigente cerca”** — PWA install sí; no Web Push.
10. **Observabilidad del embudo norte** — eventos sí; no dashboard admin global ni alertas.
11. **Merge a `main`** — la cadena sigue en drafts; riesgo de divergencia.
12. **Contexto Claude en main** — `AGENTS.md` / `docs/claude-project/` estaban en rama paralela; hay que unificarlos.

## Métrica norte (definición fijada)

Sesiones distintas con `gps_ok` + `promo_open` + `sucursal_vista`. No likes.
