#!/usr/bin/env bash
# Empaqueta el contexto TraGo para subir a Claude.ai → Proyecto TraGo → Archivos.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/docs/claude-project"
ZIP="$OUT_DIR/trago-claude-context.zip"
STAGE="$(mktemp -d)"

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$OUT_DIR"
cp "$ROOT/docs/claude-project/INSTRUCCIONES.md" "$STAGE/"
cp "$ROOT/docs/claude-project/COMO-CONECTAR.md" "$STAGE/"
cp "$ROOT/docs/claude-project/PASO-A-PASO.md" "$STAGE/"
cp "$ROOT/docs/claude-project/CONTEXTO-COMPLETO.md" "$STAGE/"
cp "$ROOT/docs/claude-project/ESTADO-ACTUAL.md" "$STAGE/"
cp "$ROOT/docs/claude-project/PROMPT-SIGUIENTE.md" "$STAGE/"
cp "$ROOT/AGENTS.md" "$STAGE/"
cp "$ROOT/CLAUDE.md" "$STAGE/"
cp "$ROOT/README.md" "$STAGE/"
cp "$ROOT/docs/PITCH-TRAGO.md" "$STAGE/"
cp "$ROOT/GUIA_MONGODB_TRAGO.txt" "$STAGE/"
cp "$ROOT/.cursor/rules/trago-vision.mdc" "$STAGE/trago-vision.mdc"

rm -f "$ZIP"
(cd "$STAGE" && zip -q -r "$ZIP" .)

echo "Listo: $ZIP"
echo "Contenido:"
unzip -l "$ZIP"
