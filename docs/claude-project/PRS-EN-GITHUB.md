# PRs ya en GitHub — léelos del repo

Repo: https://github.com/Darckmoud58/trago-pwa  

**No asumas el estado de `main` solo.** La punta de producto + seguridad está en la cadena de PRs (draft). Usa `gh pr view <n>` o lee el diff en GitHub.

## Cadena (mergear en orden hacia `main`)

| PR | Rama head | Base | Tema |
|----|-----------|------|------|
| [#1](https://github.com/Darckmoud58/trago-pwa/pull/1) | `cursor/contexto-persistente-trago-e557` | `main` | Contexto AGENTS/CLAUDE (paralela; contenido ya absorbido en #8+) |
| [#3](https://github.com/Darckmoud58/trago-pwa/pull/3) | `cursor/auth-cadena-panel-e557` | `cursor/voto-vigencia-quickwins-e557` | Panel cadena + auth empresa |
| [#4](https://github.com/Darckmoud58/trago-pwa/pull/4) | `cursor/ligar-promo-sucursales-e557` | … | Ligar promo↔sucursal |
| [#5](https://github.com/Darckmoud58/trago-pwa/pull/5) | `cursor/moderacion-reportes-e557` | … | Moderación anti-abuso |
| [#6](https://github.com/Darckmoud58/trago-pwa/pull/6) | `cursor/metrica-norte-e557` | … | Métrica norte |
| [#7](https://github.com/Darckmoud58/trago-pwa/pull/7) | `cursor/gate-18-server-e557` | … | Gate 18+ server |
| [#8](https://github.com/Darckmoud58/trago-pwa/pull/8) | `cursor/mapa-vigencia-e557` | … | Mapa vigencia + paquete Claude |
| [#9](https://github.com/Darckmoud58/trago-pwa/pull/9) | `cursor/seguridad-p1-e557` | #8 | **Seguridad P1** (JWT, CORS, auth) |
| [#10](https://github.com/Darckmoud58/trago-pwa/pull/10) | `cursor/seguridad-p7-ci-e557` | #9 | **Seguridad P7** CI / seed / Dependabot |
| (R1) | `cursor/seguridad-r1-age-cookie-e557` | #10 | **R1** Gate 18+ cookie firmada (cierra R-01) |

La base de #3 (`cursor/voto-vigencia-quickwins-e557`) trae quick wins + voto de vigencia (#1 producto del backlog).

## Cómo pedirle a Claude que audite el estado real

Pega esto en el Project TraGo:

```
Lee el estado REAL desde GitHub, no solo main:
- https://github.com/Darckmoud58/trago-pwa/pull/9 (P1 seguridad)
- https://github.com/Darckmoud58/trago-pwa/pull/8 … #3 (producto)
- docs/claude-project/ESTADO-ACTUAL.md y PRS-EN-GITHUB.md en la rama tip

Actualiza tu auditoría: marca S-01/token_login/CORS/helmet según P1;
marca voto/cadena/métrica/gate/mapa según #3–#8.
Propón SOLO lo que aún falta (P2 rate limit, P6 CSP/SW, alinear P3 cookie, etc.).
```

## Operativo pendiente (humano)

- Netlify: `JWT_SECRET` ≥32  
- Atlas: usuario solo TraGo  
- Activar secret scanning + Dependabot en settings del repo (el YAML ya viene en P7)
