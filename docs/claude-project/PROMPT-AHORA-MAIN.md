# Prompt — pegar en Claude.ai Project TraGo (Free)

---

TraGo: el código de producto + seguridad + Web Push **ya está en `main`** (merge deploy #16).

Repo: https://github.com/Darckmoud58/trago-pwa  
Rama a mirar: **`main`** (HEAD incluye PRs #3–#14 y #16).

Contexto local subido: `CONTEXTO-COMPLETO.md` + `PRS-EN-GITHUB.md` + `ESTADO-ACTUAL.md`.

**No re-audites como si main estuviera vacío.** Asume hecho en main:
- Panel cadena, ligar promo↔sucursal, moderación, métrica norte, mapa vigencia
- Gate 18+ server + cookie firmada (R1)
- Rate limit Mongo + /cerca MX + job Netlify (R2)
- Métricas anti-contaminación (R3)
- Web Push / VAPID (claves **propias de TraGo** en env; nunca las de Todo_pwa)
- CI / Dependabot (P7)

**Tu salida (corta, plan Free):**
1. Tabla: hallazgo → estado (`hecho en main` / `sigue abierto`).
2. Solo pendientes reales (ej. R4 audit/cadena, P6 CSP/SW, Netlify env, Atlas dedicado).
3. **Un** siguiente prompt único para Cursor — sin repetir P1 ni R1–R3.

Importante: VAPID de TraGo ≠ VAPID de Todo_pwa (secretos por proyecto).

---
