# Admin tokens du serveur MCP

Le serveur MCP n'accepte que des **Admin tokens** (un API token Content API reçoit un 401). Un Admin token
appartient à un utilisateur admin (ici Camille Demo, `admin@example.com`) et ne peut pas dépasser ses droits.

| Nom | Variable `.env` | Permissions sur Article | Tools exposés |
|---|---|---|---|
| MCP Claude Code (complet) | `STRAPI_MCP_ADMIN_TOKEN` | Lire, Créer, Mettre à jour, Publier, Supprimer ; locales fr et en | 8 tools article + `log` |
| MCP lecture seule | `STRAPI_MCP_READONLY_TOKEN` | Lire ; locales fr et en | `list_article`, `get_article`, `log` |

Durée : Illimité. Aucun droit sur Author, Category ni la Media Library.

## Trois façons de les obtenir

### 1. Automatique : bootstrap du SOCLE (après intégration)

`npm run demo:reset` puis démarrage : le bootstrap (`src/index.ts`) crée les deux tokens s'ils manquent et
impose les valeurs fixes de `.env`. Code et variables : `docs/handoff/config-requests/mcp.md`. Vérifié sur
le port 1338 : après reset, les deux tokens fonctionnent avec les valeurs de `.env` ; un simple redémarrage
ne crée pas de doublon.

### 2. Par script : API REST admin

```bash
PORT=1337 node docs/mcp/create-tokens.mjs             # crée les tokens manquants
PORT=1337 node docs/mcp/create-tokens.mjs --recreate  # les supprime et les recrée
```

Le script se connecte avec `POST /admin/login` (`DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD`), puis appelle
les routes de `@strapi/admin` 5.54.0 (`dist/server/server/src/routes/admin-tokens.js`) :

| Route | Rôle |
|---|---|
| `GET /admin/admin-tokens` | liste (uniquement `kind: admin`) |
| `POST /admin/admin-tokens` | création ; la réponse contient `accessKey` en clair, une seule fois |
| `DELETE /admin/admin-tokens/:id` | suppression |
| `POST /admin/admin-tokens/:id/regenerate` | nouvelle valeur (propriétaire uniquement) |

Corps de création (le contrôleur refuse `type` et `permissions`, réservés aux API tokens) :

```json
{
  "name": "MCP lecture seule",
  "description": "Admin token du serveur MCP : lecture des articles uniquement.",
  "lifespan": null,
  "adminPermissions": [
    {
      "action": "plugin::content-manager.explorer.read",
      "subject": "api::article.article",
      "properties": { "locales": ["fr", "en"] }
    }
  ]
}
```

Sortie réelle (valeurs tronquées) :

```
[mcp] "MCP Claude Code (complet)" créé (id 7, kind admin, article : read, create, update, publish, delete)
[mcp] "MCP lecture seule" créé (id 8, kind admin, article : read)

# À coller dans le shell (valeurs affichées une seule fois) :
export STRAPI_MCP_ADMIN_TOKEN=b29d51761edf...
export STRAPI_MCP_READONLY_TOKEN=e8393836b917...
```

Sans `properties.locales`, les tools sont exposés mais le paramètre `locale` est interdit
(`"No locale access for this action."`) : on ne peut plus cibler fr ou en.

### 3. À la main dans l'admin

Libellés relevés dans les traductions de `@strapi/admin` 5.54.0 (`translations/fr.json`). **La page Admin
tokens n'est pas traduite en français dans cette version** : son titre, son bouton et ses messages restent
en anglais même avec l'admin en français (les libellés entre guillemets anglais ci-dessous sont ceux
réellement affichés). Parcours non vérifié visuellement : je n'ai pas ouvert l'admin dans un navigateur,
car il aurait fallu y saisir le mot de passe ; la création a été vérifiée par l'API, qui est celle
qu'appelle ce formulaire.

1. Se connecter sur http://localhost:1337/admin avec l'admin de démo.
2. Menu de gauche : **Paramètres**, puis section **Panneau d'aministration** (sic, faute présente dans la
   traduction officielle), entrée **Admin Tokens**.
3. Bouton **Create new Admin Token** (ou **Create your first Admin Token** si la liste est vide).
4. Formulaire **Détails** : **Nom** = `MCP Claude Code (complet)`, **Description** au choix,
   **Durée de vie du jeton** = **Illimité**.
5. Permissions, onglet **Types de collection**, ligne **Article** : cocher **Créer**, **Lire**,
   **Mettre à jour**, **Supprimer**, **Publier**. Déplier la ligne Article et vérifier que, sous
   **Locales**, French (fr) et English (en) sont cochées (sinon le MCP refuse le paramètre locale).
   Ne rien cocher d'autre (ni Author, ni Category, ni les onglets **Types uniques**, **Plugins**,
   **Paramètres**).
6. **Enregistrer**. Notification « Admin Token successfully created » ; le jeton s'affiche en haut
   de la page avec un bouton de copie. Message affiché : « Assurez-vous de copier ce jeton, vous ne
   pourrez plus le revoir par la suite ! ».
7. Recommencer pour `MCP lecture seule` en ne cochant que **Lire**.

La liste affiche les colonnes Name, Description, Created at, Last used et Owner (en anglais).
Une valeur créée à la main est aléatoire : elle ne survit pas à `demo:reset`. Pour la démo, préférer
le bootstrap (valeurs fixes).
