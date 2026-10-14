# Conectar Claude.ai (proyecto TraGo) con el repo

Claude.ai **Projects** guarda instrucciones + archivos subidos.  
**No monta** la carpeta del disco en vivo. Para acceso a la carpeta usa **Claude Code** o **Cursor Cloud** (este repo).

Atajo: sigue [`PASO-A-PASO.md`](PASO-A-PASO.md). Un solo archivo: [`CONTEXTO-COMPLETO.md`](CONTEXTO-COMPLETO.md).

## A) Claude.ai Project — todo el contexto (5 minutos)

1. Abre el proyecto **TraGo** en claude.ai.
2. **Instrucciones → Agregar / Editar**  
   Pega el contenido completo de [`INSTRUCCIONES.md`](INSTRUCCIONES.md)  
   (no pegues el `.mdc` de Cursor con el YAML `---`; ese frontmatter es solo para Cursor).
3. **Archivos → Agregar** y sube al menos [`CONTEXTO-COMPLETO.md`](CONTEXTO-COMPLETO.md), o estos del repo (o el zip del script):

   | Archivo | Ruta en el repo |
   |---------|-----------------|
   | Pitch | `docs/PITCH-TRAGO.md` |
   | Agentes | `AGENTS.md` |
   | README | `README.md` |
   | Mongo | `GUIA_MONGODB_TRAGO.txt` |
   | Claude Code | `CLAUDE.md` |
   | Instrucciones (copia) | `docs/claude-project/INSTRUCCIONES.md` |

4. Opcional: `docs/Especificaciones_BD_TraGo_MongoDB.docx`, `docs/TraGo-Pitch-Comercial.docx`.
5. Nueva sesión en TraGo → Claude ya parte de la tesis.

### Empaquetar para subir

Desde la raíz del repo:

```bash
bash scripts/pack-claude-context.sh
```

Genera `docs/claude-project/trago-claude-context.zip`. Súbelo (o sus archivos) en **Archivos**.

## B) Acceso a la carpeta (código en vivo)

| Herramienta | Qué hace |
|-------------|----------|
| **Cursor Cloud / este chat** | Ya trabaja sobre el repo GitHub `trago-pwa`, con reglas + `AGENTS.md`. |
| **Claude Code** (CLI) | En tu máquina: `cd` a la carpeta del repo y abre `claude`. Lee `CLAUDE.md` + el árbol. |
| **Claude.ai web** | Solo archivos subidos; no ve commits nuevos hasta que los vuelvas a subir o regeneres el zip. |

### Claude Code (carpeta local)

```bash
cd /ruta/a/trago-pwa   # o PW/trago
claude
```

Primera vez: confirma que puede leer el directorio. El archivo `CLAUDE.md` en la raíz le da el mapa.

## C) Flujo de la mano (recomendado)

1. **Visión / copy / decisión de producto** → Claude.ai Project TraGo (instrucciones + archivos).
2. **Implementar en el repo** → Cursor Cloud (PR) o Claude Code en la carpeta.
3. Cuando cambie la tesis o el backlog: actualiza `docs/claude-project/INSTRUCCIONES.md` en Git, vuelve a pegar en Claude, y re-ejecuta el zip.

## Qué no esperar

- No hay API desde este Cloud Agent para “empujar” archivos a tu cuenta claude.ai automáticamente.
- El Free plan de Claude limita memoria/archivos; si falla la subida, prioriza: `INSTRUCCIONES.md` + `PITCH-TRAGO.md` + `AGENTS.md` + `README.md`.
