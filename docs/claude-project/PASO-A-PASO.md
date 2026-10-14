# Pasarle TraGo a Claude.ai (lo más simple)

Yo (Cursor Cloud) **no puedo iniciar sesión** en tu Claude. Tú cargas el repo/contexto en 3 clics.

## 1) Abre estos links (rama del PR)

| Qué | Link |
|-----|------|
| **Archivo único (súbelo entero)** | https://github.com/Darckmoud58/trago-pwa/blob/cursor/contexto-persistente-trago-e557/docs/claude-project/CONTEXTO-COMPLETO.md |
| Instrucciones (pegar en Instrucciones) | https://github.com/Darckmoud58/trago-pwa/blob/cursor/contexto-persistente-trago-e557/docs/claude-project/INSTRUCCIONES.md |
| Repo completo | https://github.com/Darckmoud58/trago-pwa/tree/cursor/contexto-persistente-trago-e557 |

En cada archivo de GitHub: botón **Raw** → Guardar / copiar todo.

## 2) En Claude → proyecto TraGo

1. **Instrucciones → Agregar**  
   Pega el contenido de `INSTRUCCIONES.md` (no el `.mdc` con `---`).
2. **Archivos → Agregar**  
   Sube `CONTEXTO-COMPLETO.md` (con eso ya tiene pitch + AGENTS + README + Mongo + mapa).
3. Si tu plan muestra **GitHub / sincronizar repo**:  
   repo `Darckmoud58/trago-pwa`, rama `cursor/contexto-persistente-trago-e557` (o `main` cuando merges el PR).

## 3) Código en vivo (carpeta)

Claude.ai **no abre tu disco**. Para tocar archivos:

- **Cursor Cloud** (este chat) → PRs en GitHub, o  
- **Claude Code** en tu PC: `cd` a la carpeta del repo → `claude`

## 4) Merge (recomendado)

Cuando merges https://github.com/darckmoud58/trago-pwa/pull/1, todo queda en `main` y deja de “desaparecer” si miras la rama mala.
