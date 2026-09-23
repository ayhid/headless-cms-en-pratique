# Tools MCP réellement exposés (Strapi 5.54.0)

Relevé le 23/09/2026 sur l'instance de l'agent MCP (port 1338), par `initialize` puis `tools/list`
en JSON-RPC avec curl. Transport Streamable HTTP **sans état** : pas d'en-tête `mcp-session-id`
dans la réponse, chaque POST est authentifié seul ; on peut appeler `tools/list` sans `initialize`.
La réponse arrive en `text/event-stream` (une ligne `event: message` puis une ligne `data: {...}`).

```bash
curl -s -X POST http://localhost:1337/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $STRAPI_MCP_ADMIN_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Réponse à `initialize` (sortie réelle) :

```
event: message
data: {"result":{"protocolVersion":"2025-06-18","capabilities":{"logging":{},"tools":{"listChanged":true}},"serverInfo":{"name":"strapi-mcp-server","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

## Token complet « MCP Claude Code (complet) » : 9 tools

Permissions : `plugin::content-manager.explorer.{read,create,update,publish,delete}` sur `api::article.article`,
locales fr et en.

| Tool | Paramètres (obligatoires en gras) | Permission |
|---|---|---|
| `list_article` | locale, status, page, pageSize, sort, filters | read |
| `get_article` | **documentId**, locale, status | read |
| `create_article` | **data** (title obligatoire), locale | create |
| `update_article` | **documentId**, **data**, locale | update |
| `delete_article` | **documentId**, locale | delete |
| `publish_article` | **documentId**, locale | publish |
| `unpublish_article` | **documentId**, locale, discardDraft | publish |
| `discard_article_draft` | **documentId**, locale | publish |
| `log` | **message**, level | aucune (mode develop uniquement) |

Attention aux noms : c'est `discard_article_draft`, et non `discard_draft_article`. Le tool de suppression
existe bien : `delete_article`.

- `data.title` est obligatoire pour `create_article` ET pour `update_article` (sinon :
  `Input validation error: ... data.title: Invalid input: expected string, received undefined`).
  La mise à jour reste partielle : les champs absents de `data` (slug, etc.) sont conservés (vérifié).
- `locale` : enum `["en","fr"]`, défaut `"fr"` (la locale par défaut de Strapi).
- `status` (list, get) : `draft` ou `published`, défaut `draft`.
- `data` de create/update : `title`, `slug`, `cover`, `excerpt`, `author`, `category` (documentId en
  chaîne ou objet `{documentId, locale, status}`), `blocks` (tableau non typé, limite connue des dynamic
  zones), `seo` (`metaTitle` max 70, `metaDescription` max 160, `shareImage`), `publishAt`.
- Aucun tool pour `author` ni `category` : le token ne donne des droits que sur `article`. On peut quand
  même rattacher un auteur ou une catégorie par son documentId.
- Aucun tool Media Library (`media_*`) : le token n'a aucune permission `plugin::upload.*`.
- Il n'existe pas de tool « lister les types » : c'est `tools/list` lui-même qui montre ce que le token
  peut gérer.

## Token lecture seule « MCP lecture seule » : 3 tools

Permissions : `plugin::content-manager.explorer.read` sur `api::article.article`, locales fr et en.

| Tool | Paramètres |
|---|---|
| `list_article` | locale, status, page, pageSize, sort, filters |
| `get_article` | **documentId**, locale, status |
| `log` | **message**, level |

Appeler malgré tout un tool masqué (sortie réelle, HTTP 200 avec une erreur JSON-RPC) :

```
data: {"jsonrpc":"2.0","id":4,"error":{"code":-32602,"message":"Tool publish_article disabled"}}
data: {"jsonrpc":"2.0","id":5,"error":{"code":-32602,"message":"Tool create_article disabled"}}
```

## Authentification (codes réels)

| Requête | Résultat |
|---|---|
| POST /mcp sans token | HTTP 401 `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Authentication required"},"id":null}` |
| POST /mcp avec l'API token Content API `STRAPI_READ_TOKEN` | HTTP 401, même corps |
| POST /mcp avec un Admin token | HTTP 200 |
| GET /mcp (même avec Admin token) | HTTP 405 `{"jsonrpc":"2.0","error":{"code":-32601,"message":"Method not allowed"},"id":null}` |
| GET /api/articles avec un Admin token | HTTP 401 `Missing or invalid credentials` (séparation stricte dans les deux sens) |
| POST /mcp quand `mcp.enabled` vaut false | HTTP 405 |

## Piège : la permission doit porter les locales

Un Admin token créé sans `properties.locales` expose bien les tools, mais leur paramètre `locale` devient
`{"description":"No locale access for this action.","not":{}}` : impossible de créer un article en fr.
Il faut `properties: { locales: ['fr', 'en'] }` sur chaque permission (fait par `docs/mcp/create-tokens.mjs`
et par le bootstrap proposé dans la config request).

## Titres affichés par les clients

Chaque tool a aussi un `title` fourni par Strapi, en anglais, de la forme « Content: article, list »
(Strapi y met un tiret cadratin entre le type et l'action, non reproduit ici). Claude Code peut l'afficher
dans `/mcp` : c'est le texte de Strapi, pas le nôtre.
