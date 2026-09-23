# Handoff MCP (phase 2)

Serveur MCP natif de Strapi 5.54.0 (`/mcp`, transport Streamable HTTP sans état), piloté par Claude Code
avec deux Admin tokens. Tout a été vérifié sur l'instance du worktree MCP (port 1338).

## Fichiers

| Fichier | Rôle |
|---|---|
| `.mcp.json.example` | config client Claude Code : `http://localhost:1337/mcp`, `Authorization: Bearer ${STRAPI_MCP_ADMIN_TOKEN}` |
| `docs/mcp/scenario.md` | scénario de démo répété avec `claude -p`, sorties réelles |
| `docs/mcp/tools.md` | liste réelle des tools (token complet, token lecture seule), codes d'erreur |
| `docs/mcp/admin-tokens.md` | création des Admin tokens : bootstrap, API REST admin, parcours dans l'admin |
| `docs/mcp/create-tokens.mjs` | création des 2 Admin tokens par l'API REST admin (`node`, aucune dépendance) |
| `docs/mcp/mcp-curl.sh` | plan B : tout le scénario en JSON-RPC avec curl |
| `scripts/checks/mcp.ts` | 4 contrôles MCP dans `npm run demo:check` |
| `docs/handoff/config-requests/mcp.md` | `mcp.enabled: true` + bootstrap des Admin tokens à valeur fixe + 2 variables `.env` |

## Ce qui marche (vérifié)

- `mcp: { enabled: true }` : log `[MCP] Server available at /mcp`. Sans token : 401. Désactivé : 405.
- **API token Content API rejeté** : `STRAPI_READ_TOKEN` sur `/mcp` renvoie HTTP 401
  `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Authentication required"},"id":null}`.
  Dans l'autre sens, un Admin token sur `/api/articles` renvoie aussi 401.
- **Admin token accepté** : `initialize` renvoie HTTP 200, `serverInfo.name = strapi-mcp-server`,
  aucun en-tête `mcp-session-id` (sans état : `tools/list` fonctionne sans `initialize`).
- **Token complet** : 8 tools article (`list_article`, `get_article`, `create_article`, `update_article`,
  `delete_article`, `publish_article`, `unpublish_article`, `discard_article_draft`) + `log`.
- **Token lecture seule** : `list_article`, `get_article`, `log`. Un appel forcé à `publish_article`
  renvoie `{"code":-32602,"message":"Tool publish_article disabled"}`.
- **Création des tokens par API** : `POST /admin/admin-tokens` avec `adminPermissions` (script
  `create-tokens.mjs`). **Bootstrap à valeur fixe** : testé localement (reset puis restart, pas de doublon).
- **Agent réel** : `claude -p` (Claude Code 2.1.280) avec `--mcp-config` temporaire sur 1338,
  `--strict-mcp-config`, `--allowedTools "mcp__strapi__*"`. Rien ajouté à la config de l'utilisateur.
  Il a listé les tools, créé le brouillon fr, mis à jour le résumé ; avec le token lecture seule, il a
  expliqué qu'il ne pouvait pas publier.
- **Critère d'acceptation** : `GET /content-manager/collection-types/api::article.article?locale=fr` (JWT
  admin) renvoie l'article créé par l'agent avec `status: "draft"`, `publishedAt: null`, créé par Camille Demo.
- `npm run demo:check` : 12/12 OK avec la config request appliquée ; sans elle, le check MCP dit
  « MCP pas encore activé : POST /mcp répond HTTP 405 au lieu de 401 ... ».

## Démo en 60 secondes

```bash
set -a; . ./.env; set +a                       # exporte STRAPI_MCP_ADMIN_TOKEN et STRAPI_MCP_READONLY_TOKEN
claude --mcp-config .mcp.json.example --strict-mcp-config
#   /mcp : "strapi" connecté
#   « Liste les types de contenu que tu peux gérer, puis crée un brouillon d'article en français
#     titré ... , puis mets à jour son résumé. Ne publie rien. » (prompt complet dans docs/mcp/scenario.md)
# Admin : Content Manager > Article (fr) : le brouillon est là, créé par Camille Demo.
STRAPI_MCP_ADMIN_TOKEN=$STRAPI_MCP_READONLY_TOKEN claude --mcp-config .mcp.json.example --strict-mcp-config
#   « Publie l'article <documentId> » : l'agent répond qu'il n'a que list_article, get_article et log.
```

Plan B sans modèle : `bash docs/mcp/mcp-curl.sh` (sortie réelle, port 1338) :

```
1. Un API token Content API est refusé par /mcp :
   HTTP 401
2. Tools exposés au token complet :
   "log"
   "list_article"
   "get_article"
   "create_article"
   "update_article"
   "delete_article"
   "publish_article"
   "unpublish_article"
   "discard_article_draft"
3. Création d'un brouillon en fr (brouillon-mcp-curl-111827) :
   documentId=wsmhkmxr50k8ni7oqyxqkrwn
4. Mise à jour du résumé (data.title est obligatoire aussi pour update_article) :
   "slug":"brouillon-mcp-curl-111827
   "excerpt":"Résumé mis à jour via MCP.
5. Tools exposés au token lecture seule :
   "log"
   "list_article"
   "get_article"
6. Le token lecture seule tente de publier :
   {"jsonrpc":"2.0","id":1,"error":{"code":-32602,"message":"Tool publish_article disabled"}}
7. Statut dans le Content Manager (JWT admin) :
   "publishedAt":null
   "status":"draft"
```

## Ce qui casse si on touche à quoi

- **Permissions du token** : les tools visibles sont recalculés à chaque requête (sans état). Retirer
  `delete` fait disparaître `delete_article` au prochain appel, sans redémarrage (vérifié :
  `PUT /admin/admin-tokens/:id` sans delete, puis `tools/list` passe de 9 à 8 tools ; remis ensuite).
  Si le bootstrap est en place, il ne réaligne pas les permissions d'un token existant : seul
  `demo:reset` les remet d'aplomb. **Oublier les locales**
  dans les permissions (`properties.locales`) laisse les tools visibles mais interdit le paramètre `locale`
  (« No locale access for this action. ») : plus de création en fr. Dans l'admin, déplier la ligne Article
  et vérifier Locales.
- **Propriétaire du token** : un Admin token appartient à Camille Demo. Supprimer cet admin supprime ses
  tokens ; le désactiver les rend inutilisables (401). Le bootstrap proposé retrouve l'admin par
  `DEMO_ADMIN_EMAIL` : changer cet e-mail recrée un admin mais les tokens restent à l'ancien propriétaire
  (faire un `demo:reset`).
- **Noms des tokens** (« MCP Claude Code (complet) », « MCP lecture seule ») : le bootstrap les retrouve par
  leur nom, renommer dans l'admin = nouveau token créé au redémarrage. Un nom est unique pour tous les
  tokens (API tokens compris).
- **`API_TOKEN_SALT`** : il sert aussi au hash des Admin tokens ; le changer invalide les valeurs en base
  jusqu'au redémarrage suivant (le bootstrap les réaligne).
- **`mcp.enabled`** : pris en compte au démarrage uniquement, redémarrer Strapi. Désactivé = 405 sur POST.
- **Redémarrage de Strapi pendant la démo** : pas de session MCP à perdre (sans état), Claude Code
  reconnecte au prochain appel. Mais `strapi develop` recompile au moindre changement de `src/` ou `config/`.
- **Noms des tools** : générés depuis le singularName du content-type (`article`). Renommer le type ou le
  singularName renomme les tools (`list_<nom>`), et les prompts ou le check (`scripts/checks/mcp.ts`)
  deviennent faux. Attention, c'est `discard_article_draft` et non `discard_draft_article`.
- **`update_article` exige `data.title`** même pour une mise à jour partielle (Claude le gère seul ;
  à savoir pour les appels curl). Les champs absents sont conservés.
- **Slug en double** : un second brouillon avec le même slug est accepté. Rejouer la démo sans reset
  crée un doublon : faire `demo:reset` ou changer le slug.
- **`log`** : n'existe qu'en mode develop (`strapi develop`), pas en `strapi start`.
- **Nouveau type ou champ** : les schémas des tools suivent le modèle au démarrage. Un tool du plugin
  (agent PLUGIN) apparaîtra dans `tools/list` si le token a les permissions correspondantes.
- **Port** : `.mcp.json.example` vise 1337. Sur une autre instance, en faire une copie avec le bon port.

## Écarts et limites

- **Pas de capture de l'admin** : je n'ai pas ouvert l'admin dans un navigateur (il aurait fallu saisir
  le mot de passe). Le parcours manuel est documenté depuis le code et les traductions fr de
  `@strapi/admin` 5.54.0. La page Admin Tokens **n'est pas traduite en français** dans cette version
  (titre, bouton « Create new Admin Token », colonnes en anglais). Le reste du formulaire l'est
  (« Nom », « Durée de vie du jeton », « Illimité », « Enregistrer »).
- **Tirets cadratins hors de notre contrôle** : les `title` des tools fournis par Strapi en contiennent un
  (affichables par `/mcp` dans Claude Code), et l'agent en a produit un dans un tableau lors d'un test.
  Nos fichiers n'en contiennent aucun ; les prompts du scénario demandent une réponse courte sans tableau.
- Il n'existe pas de tool « lister les types » : l'agent déduit les types de `tools/list` (il l'a fait
  correctement au test).
