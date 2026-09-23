#!/usr/bin/env bash
# Plan B de la démo MCP : rejoue le scénario en JSON-RPC avec curl, sans client IA.
#   bash docs/mcp/mcp-curl.sh            # Strapi sur le port de apps/backend/.env (1337 par défaut)
#   PORT=1338 bash docs/mcp/mcp-curl.sh  # autre port
# Lit STRAPI_READ_TOKEN, STRAPI_MCP_ADMIN_TOKEN et STRAPI_MCP_READONLY_TOKEN dans apps/backend/.env
# (à lancer depuis n'importe où : le script se place à la racine du dépôt).
set -euo pipefail
cd "$(dirname "$0")/../.."
PORT_OVERRIDE="${PORT:-}"
set -a; . ./apps/backend/.env; set +a
[ -n "$PORT_OVERRIDE" ] && PORT="$PORT_OVERRIDE"
URL="http://localhost:${PORT:-1337}/mcp"
SLUG="brouillon-mcp-curl-$(date +%H%M%S)"

rpc() { # rpc <token> <methode> <params json>
  curl -s -X POST "$URL" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    -H "Authorization: Bearer $1" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$2\",\"params\":$3}" | sed -n 's/^data: //p'
}
call() { rpc "$1" tools/call "{\"name\":\"$2\",\"arguments\":$3}"; }

echo "1. Un API token Content API est refusé par /mcp :"
curl -s -o /dev/null -w '   HTTP %{http_code}\n' -X POST "$URL" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' -H "Authorization: Bearer $STRAPI_READ_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

echo "2. Tools exposés au token complet :"
rpc "$STRAPI_MCP_ADMIN_TOKEN" tools/list '{}' | grep -o '"name":"[a-z_]*"' | sed 's/"name":/   /'

echo "3. Création d'un brouillon en fr ($SLUG) :"
CREATED=$(call "$STRAPI_MCP_ADMIN_TOKEN" create_article \
  "{\"locale\":\"fr\",\"data\":{\"title\":\"Brouillon créé en JSON-RPC\",\"slug\":\"$SLUG\",\"excerpt\":\"Premier jet envoyé avec curl.\"}}")
DOC=$(echo "$CREATED" | grep -o '\\"documentId\\":\\"[a-z0-9]*' | head -1 | sed 's/.*\\"//')
echo "   documentId=$DOC"

echo "4. Mise à jour du résumé (data.title est obligatoire aussi pour update_article) :"
call "$STRAPI_MCP_ADMIN_TOKEN" update_article \
  "{\"documentId\":\"$DOC\",\"locale\":\"fr\",\"data\":{\"title\":\"Brouillon créé en JSON-RPC\",\"excerpt\":\"Résumé mis à jour via MCP.\"}}" \
  | grep -o '\\"slug\\":\\"[^\\]*\|\\"excerpt\\":\\"[^\\]*' | sed 's/\\//g; s/^/   /'

echo "5. Tools exposés au token lecture seule :"
rpc "$STRAPI_MCP_READONLY_TOKEN" tools/list '{}' | grep -o '"name":"[a-z_]*"' | sed 's/"name":/   /'

echo "6. Le token lecture seule tente de publier :"
call "$STRAPI_MCP_READONLY_TOKEN" publish_article "{\"documentId\":\"$DOC\",\"locale\":\"fr\"}" | sed 's/^/   /'

echo "7. Statut dans le Content Manager (JWT admin) :"
JWT=$(curl -s -X POST "http://localhost:${PORT:-1337}/admin/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEMO_ADMIN_EMAIL\",\"password\":\"$DEMO_ADMIN_PASSWORD\"}" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
curl -s "http://localhost:${PORT:-1337}/content-manager/collection-types/api::article.article/$DOC?locale=fr" \
  -H "Authorization: Bearer $JWT" | grep -o '"status":"[a-z]*"\|"publishedAt":[a-z0-9"]*' | head -2 | sed 's/^/   /'
