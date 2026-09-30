#!/usr/bin/env bash
# Configura env de Netlify para TraGo API (Function + Atlas)
set -euo pipefail
ROOT="/Users/marioalbertoramozgonzalez/Downloads/UTJ/PW/trago"
SITE=25b67cb3-daa6-4a5b-91ba-102123b60024
ACCOUNT=682ce26a5a310610c1f4d0eb
TOKEN=$(python3 -c "import json,os; c=json.load(open(os.path.expanduser('~/Library/Preferences/netlify/config.json'))); u=next(iter(c['users'].values())); print(u['auth']['token'])")

set -a
# shellcheck disable=SC1091
source "$ROOT/server/.env"
set +a

upsert() {
  local KEY="$1" VAL="$2" SECRET="$3"
  curl -sS -o /dev/null -w "del %{http_code}\n" -X DELETE -H "Authorization: Bearer $TOKEN" \
    "https://api.netlify.com/api/v1/accounts/$ACCOUNT/env/$KEY?site_id=$SITE" || true
  BODY=$(KEY="$KEY" VAL="$VAL" SECRET="$SECRET" python3 - <<'PY'
import json, os
print(json.dumps({
  "key": os.environ["KEY"],
  "scopes": ["builds", "functions", "runtime", "post_processing"],
  "values": [{"value": os.environ["VAL"], "context": "all"}],
  "is_secret": os.environ.get("SECRET") == "1",
}))
PY
)
  CODE=$(curl -sS -o /tmp/ntl_set.json -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.netlify.com/api/v1/accounts/$ACCOUNT/env?site_id=$SITE" \
    -d "$BODY")
  echo "set $KEY -> $CODE"
}

upsert VITE_API_URL "" 0
upsert MONGODB_DB "${MONGODB_DB:-trago}" 0
upsert JWT_SECRET "$JWT_SECRET" 1
upsert NETLIFY "true" 0
upsert MONGODB_URI "$MONGODB_URI" 1
echo DONE
