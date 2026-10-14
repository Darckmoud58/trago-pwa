# TraGo — estado técnico (post PRs #2–#8)

Actualizado para Claude.ai / Claude Code. Repo: https://github.com/Darckmoud58/trago-pwa

## Cadena de PRs (draft, mergear en orden)

Lista viva con URLs: [`PRS-EN-GITHUB.md`](./PRS-EN-GITHUB.md). Prompt para Claude: [`PROMPT-LEER-PRS.md`](./PROMPT-LEER-PRS.md).

| PR | Rama | Qué entregó |
|----|------|-------------|
| #3 | `cursor/auth-cadena-panel-e557` | Auth cadena, CRUD promo/sucursal, panel `/cadena` |
| #4 | `cursor/ligar-promo-sucursales-e557` | Vínculo promo↔sucursal sin inventar participación OSM |
| #5 | `cursor/moderacion-reportes-e557` | Rate limit votos, flip-flop, ban, reafirmar / pausar |
| #6 | `cursor/metrica-norte-e557` | Eventos métrica norte + embudo en panel |
| #7 | `cursor/gate-18-server-e557` | Gate 18+ server + diálogo edad |
| #8 | `cursor/mapa-vigencia-e557` | Mapa OSM vigencia + paquete Claude |
| #9 | `cursor/seguridad-p1-e557` | Seguridad P1 (JWT, helmet, CORS, zod, tokenVersion) |
| #10 | `cursor/seguridad-p7-ci-e557` | CI, Dependabot, seed seguro, root package limpio |

Quick wins y voto (#1) viven en la base de esa cadena.

## Ya no es “casi ausente”

- Panel cadena + alta de promos/sucursales  
- Voto de vigencia con GPS ≤400 m  
- Ligado promo↔sucursal (sin inventar)  
- Moderación anti-abuso  
- Métrica norte instrumentada  
- Gate 18+ en servidor  
- Mapa de vigencia por local  

## Seguridad (auditoría Claude 2026-10-14)

Orden del auditor: **P1 → P2 → P3 → P6 → P4 → P5 → P8** (+ P7 tras P1).

**Hecho:** P1 (#9) · P7 (esta rama) · producto P4/P5/P3-parcial/P8 (#3–#8).  
**Siguiente tipico:** P2 (rate limit Mongo + /cerca) o P6 (CSP/SW).

Acciones operativas (sin código): JWT_SECRET en Netlify ≥32; Atlas usuario solo TraGo; no `seed` en prod.

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
