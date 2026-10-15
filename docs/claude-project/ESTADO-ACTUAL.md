# TraGo — estado técnico

Actualizado para Claude.ai / Claude Code. Repo: https://github.com/Darckmoud58/trago-pwa

## Cadena de PRs (draft → mergear hacia `main`)

URLs: [`PRS-EN-GITHUB.md`](./PRS-EN-GITHUB.md) · Prompt: [`PROMPT-LEER-PRS.md`](./PROMPT-LEER-PRS.md).

| PR | Rama | Qué entregó | ¿En main? |
|----|------|-------------|-----------|
| #1 | `cursor/contexto-persistente-trago-e557` | Docs/contexto Claude | no (contenido absorbido en #8+) |
| #2 | `cursor/voto-vigencia-quickwins-e557` | Voto ≤400 m, scrapers job 6h, puerto 4000 | **sí** (squash) |
| #3 | `cursor/auth-cadena-panel-e557` | Rol cadena, panel `/cadena`, alta promos/sucursales | no |
| #4 | `cursor/ligar-promo-sucursales-e557` | Vínculo promo↔sucursal sin inventar | no |
| #5 | `cursor/moderacion-reportes-e557` | Rate limit votos, flip-flop, ban, reafirmar | no |
| #6 | `cursor/metrica-norte-e557` | Métrica norte GPS×promo×sucursal | no |
| #7 | `cursor/gate-18-server-e557` | Gate 18+ server (header; supersedido por R1) | no |
| #8 | `cursor/mapa-vigencia-e557` | Mapa OSM vigencia + paquete Claude | no |
| #9 | `cursor/seguridad-p1-e557` | Seguridad P1 (JWT, helmet, CORS, zod) | no |
| #10 | `cursor/seguridad-p7-ci-e557` | CI, Dependabot, seed seguro | no |
| #11 | `cursor/seguridad-r1-age-cookie-e557` | Gate 18+ cookie firmada (cierra R-01) | no |
| #12 | `cursor/seguridad-r2-limits-e557` | Rate limit Mongo + job Netlify + /cerca MX | no |
| #13 | `cursor/web-push-vapid-e557` | Web Push / VAPID (paridad Todo_pwa) | no |
| #14 | `cursor/seguridad-r3-metricas-e557` | **R3** métricas anti-contaminación | no |

## Seguridad — revisión Claude post-PRs

| Hallazgo | Estado |
|----------|--------|
| R-01 Gate saltable con header/`?band=` | **#11** cookie `age_ok` firmada; anon no ve alcohol |
| R-02 P2 rate limit + job Netlify | **#12** Mongo rate limit + Scheduled Function + /cerca México |
| R-03 Métricas contaminables / lat | **#14** gps_ok MX + dedupe 24h + rate limit + strip empresaId |
| R-04 Flag auto-verify + seed | parcial en #10 (seed); falta audit_log / flag prod |
| R-05 P6 CSP/SW + zip gitignore | parcial (#10 CI); falta P6 |
| S-01 JWT changeme | cerrado en #9 |

**Siguiente:** R4 (cadena/audit) · R5/P6 (CSP/SW).

## Deploy a main / Netlify

Rama `cursor/deploy-main-e557`: merge de la punta (producto + R1–R3 + Cerca auto-GPS + VAPID) sobre `main`, resolviendo el solape del squash de #2.

## Operativo (humano)

- Netlify: `JWT_SECRET` ≥32 · VAPID_* · CRON_SECRET opcional  
- Atlas: usuario solo TraGo  
- Tras merge a `main`, Netlify redeploy automático (si el site apunta a `main`)

## Métrica norte

Sesiones con `gps_ok` + `promo_open` + `sucursal_vista`. No likes.
