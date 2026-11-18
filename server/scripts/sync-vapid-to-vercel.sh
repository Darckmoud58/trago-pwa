#!/usr/bin/env bash
# Sube VAPID_* de server/.env al proyecto API en Vercel (Production + Preview).
# Uso (desde machine con `vercel` logueado):
#   cd server && bash scripts/sync-vapid-to-vercel.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Falta server/.env"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# solo las líneas VAPID
eval "$(grep -E '^VAPID_(SUBJECT|PUBLIC_KEY|PRIVATE_KEY)=' .env | sed 's/\r$//')"
set +a

if [[ -z "${VAPID_PUBLIC_KEY:-}" || -z "${VAPID_PRIVATE_KEY:-}" || -z "${VAPID_SUBJECT:-}" ]]; then
  echo "Faltan VAPID_* en .env — corre: npm run vapid"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1 && ! npx --yes vercel --version >/dev/null 2>&1; then
  echo "Instala Vercel CLI: npm i -g vercel"
  exit 1
fi

VC=(npx --yes vercel)

echo "→ Validando longitud de pública…"
node -e "
const k=process.env.VAPID_PUBLIC_KEY;
const p='='.repeat((4-(k.length%4))%4);
const b=Buffer.from((k+p).replace(/-/g,'+').replace(/_/g,'/'),'base64');
if (b.length!==65 || b[0]!==4) { console.error('Clave inválida', b.length, b[0]); process.exit(1); }
console.log('OK pública 65 bytes');
"

echo "→ Subiendo env al proyecto API (Root Directory = server)…"
echo "  Si te pregunta el scope/proyecto, elige el de la API TraGo."

for ENV_TARGET in production preview; do
  printf '%s' "$VAPID_SUBJECT" | "${VC[@]}" env add VAPID_SUBJECT "$ENV_TARGET" --force
  printf '%s' "$VAPID_PUBLIC_KEY" | "${VC[@]}" env add VAPID_PUBLIC_KEY "$ENV_TARGET" --force
  printf '%s' "$VAPID_PRIVATE_KEY" | "${VC[@]}" env add VAPID_PRIVATE_KEY "$ENV_TARGET" --force
done

echo "→ Redeploy API (sin cache)…"
"${VC[@]}" --prod --force --yes

echo
echo "Listo. Verifica:"
echo "  curl -sS \"\$API_URL/api/push/publicKey\""
echo "Luego en la PWA: Cuenta → Activar avisos."
