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

## Seguridad — revisión Claude post-PRs

| Hallazgo | Estado |
|----------|--------|
| R-01 Gate saltable con header/`?band=` | **R1** cookie `age_ok` firmada; anon no ve alcohol |
| R-02 P2 rate limit + job Netlify | abierto |
| R-03 Métricas contaminables / lat | abierto |
| R-04 Flag auto-verify + seed | parcial en #10 (seed); falta audit_log / flag prod |
| R-05 P6 CSP/SW + zip gitignore | parcial (#10 CI); falta P6 |
| S-01 JWT changeme | cerrado en #9 |

**Siguiente:** R2 (límites Mongo + Scheduled Function Netlify).

## Operativo (humano)

- Netlify: `JWT_SECRET` ≥32  
- Atlas: usuario solo TraGo  
- Rebase punta sobre `main` descartando el commit ya squash del #2 (ver revisión Claude)

## Métrica norte

Sesiones con `gps_ok` + `promo_open` + `sucursal_vista`. No likes.
