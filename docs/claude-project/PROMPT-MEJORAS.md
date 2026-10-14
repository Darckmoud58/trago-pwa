# Prompt para pegar en Claude.ai → proyecto TraGo

Copia TODO el bloque de abajo en una **nueva sesión** del proyecto TraGo (con `CONTEXTO-COMPLETO.md` ya en Archivos).

---

Eres el copiloto de producto e ingeniería de **TraGo** (PWA de promociones vigentes: oficial × sucursal × GPS × voto de piso).

Repo: https://github.com/Darckmoud58/trago-pwa  
Stack vivo: `trago_web/` (Vite+React+TS) + `server/` (Express+Mongo).  
`web_next_legacy/` es solo referencia (ahí había panel cadena, voto vigencia, validity).

## Estado actual (auditoría reciente)

### Ya funciona
- Auth usuario JWT (login/registro/cuenta)
- Catálogo solo `origen: oficial` + scrapers de cadenas
- GPS / Cerca / OSM + promos cerca
- Detalle de promo, favoritos offline+sync, PWA install
- Legal + gate blando 18+ en home; filtro alcohol en client si hay band

### Crítico para piloto cobrable (casi ausente en stack vivo)
1. Auth de cadena + alta de promos/sucursales + panel
2. API + UI de voto vigencia (GPS; el voto matiza, no borra folio)
3. Ligar promo ↔ sucursales participantes
4. Moderación anti-abuso de reportes
5. Panel mapa de vigencia por local (venta Pro)
6. Seed crea `origen: demo` pero el listado solo muestra `oficial` → catálogo vacío tras seed
7. Scrapers en el hot path de `GET /api/promociones`
8. Puertos `:4000` vs `:4001` / Docker sin proxy `/api`
9. Sin instrumentar métrica norte: GPS × promo abierta × sucursal vista
10. Gate 18+ bypasseable; sin geocerca; teens sin login ven alcohol

## Tu tarea

Propón un plan de mejoras en español, accionable:

1. **Top 10 backlog** priorizado (impacto / esfuerzo / por qué).
2. **Qué arreglar ya** (bugs) vs **qué construir** (features) vs **qué no hacer** (anti-patrones del pitch).
3. Para los **3 primeros ítems**: especificación corta (rutas API, pantallas, modelos, criterios de aceptación). Reusa lo útil de `web_next_legacy/` si aplica.
4. **Quick wins** (≤1 día cada uno).
5. Una frase de **norte de producto** para no desviarnos.

No inventes APIs que digas que ya existen. Si dudas, márcalo como “a verificar en repo”.  
Al final: pregunta cuál bloque implementamos primero en Cursor.

---
