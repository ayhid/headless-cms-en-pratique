# Config request : MCP

Tout ce qui suit a été appliqué localement dans le worktree MCP (port 1338), testé, puis retiré avec
`git checkout` avant le commit. Le diff ci-dessous est exactement celui qui a tourné.

## 1. config/server.ts

- Pourquoi : activer le serveur MCP natif (endpoint `/mcp`), désactivé par défaut.
- Changement exact : remplacer le bloc `mcp` actuel (et la ligne de commentaire `[config request MCP]`) par :
```ts
  mcp: {
    enabled: true,
  },
```
- Variables d'environnement nouvelles : aucune pour ce point.
- Dépendances npm : aucune (`@strapi/core` 5.54.0 embarque le serveur MCP).
- Comment vérifier : au démarrage, le log affiche `[MCP] Server available at /mcp` ; puis
  `curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:1337/mcp -H 'Content-Type: application/json' -d '{}'`
  doit répondre `401` (et non `405`, qui signifie MCP désactivé).

## 2. src/index.ts : Admin tokens MCP à valeur fixe

- Pourquoi : `strapi export` n'embarque pas les tokens ; sans ce bootstrap, `demo:reset` efface les Admin
  tokens et il faudrait les recréer (valeurs aléatoires) avant chaque démo. Même technique que
  `ensureApiTokens` : création par le service officiel `admin::api-token-admin` (qui gère le propriétaire
  et les permissions admin), puis `accessKey` (hash HMAC avec `API_TOKEN_SALT`) et `encryptedKey` réécrits
  via le Query Engine.
- Changement exact :

a) Ajouter avant `export default {` :
```ts
// Admin tokens du serveur MCP, a valeur FIXE venant de .env (config request MCP).
export const MCP_ADMIN_TOKENS = [
  {
    env: 'STRAPI_MCP_ADMIN_TOKEN',
    name: 'MCP Claude Code (complet)',
    description: 'Admin token du serveur MCP : lecture, création, modification, publication et suppression des articles.',
    actions: ['read', 'create', 'update', 'publish', 'delete'],
  },
  {
    env: 'STRAPI_MCP_READONLY_TOKEN',
    name: 'MCP lecture seule',
    description: 'Admin token du serveur MCP : lecture des articles uniquement.',
    actions: ['read'],
  },
] as const;

async function ensureMcpAdminTokens(strapi: Core.Strapi) {
  // Meme technique que ensureApiTokens : creation par le service officiel (qui gere les permissions
  // admin et le proprietaire), puis accessKey/encryptedKey realignes sur .env via le Query Engine.
  // Un Admin token appartient a un utilisateur admin : ici l'admin de demo (cree juste avant).
  const email = process.env.DEMO_ADMIN_EMAIL;
  const owner = email
    ? await strapi.db.query('admin::user').findOne({ where: { email }, populate: ['roles'] })
    : null;
  if (!owner) {
    strapi.log.warn(`${LOG_PREFIX} admin de demo introuvable : Admin tokens MCP ignores`);
    return;
  }
  const tokenService = strapi.service('admin::api-token-admin');
  const encryption = strapi.service('admin::encryption');

  for (const def of MCP_ADMIN_TOKENS) {
    const value = process.env[def.env];
    if (!value) {
      strapi.log.warn(`${LOG_PREFIX} ${def.env} absent de .env : Admin token "${def.name}" ignore`);
      continue;
    }
    let token = await strapi.db.query('admin::api-token').findOne({ where: { name: def.name } });
    if (!token) {
      token = await tokenService.create(
        {
          kind: 'admin',
          name: def.name,
          description: def.description,
          lifespan: null,
          adminPermissions: def.actions.map((action) => ({
            action: `plugin::content-manager.explorer.${action}`,
            subject: 'api::article.article',
            // Sans `locales`, le MCP refuse le parametre locale ; sans `fields`, tous les champs.
            properties: { locales: ['fr', 'en'] },
          })),
        },
        owner,
      );
      strapi.log.info(`${LOG_PREFIX} Admin token MCP cree : ${def.name}`);
    }
    const hashed = tokenService.hash(value);
    if (token.accessKey !== hashed) {
      await strapi.db.query('admin::api-token').update({
        where: { id: token.id },
        data: { accessKey: hashed, encryptedKey: encryption.encrypt(value) },
      });
      strapi.log.info(`${LOG_PREFIX} valeur de l'Admin token "${def.name}" alignee sur ${def.env}`);
    }
  }
}
```

b) Dans `bootstrap`, appeler la fonction APRÈS `ensureDemoAdmin` (le propriétaire doit exister) :
```ts
    await ensureLocales(strapi);
    await ensureDemoAdmin(strapi);
    await ensureApiTokens(strapi);
    await ensureMcpAdminTokens(strapi);
    await ensureWebhook(strapi);
```

c) Dans le commentaire d'en-tête, ajouter la ligne :
` *  - deux Admin tokens MCP aux valeurs FIXES (STRAPI_MCP_ADMIN_TOKEN, STRAPI_MCP_READONLY_TOKEN) ;`

- Variables d'environnement nouvelles :
  - `STRAPI_MCP_ADMIN_TOKEN=demo-mcp-admin-950532638b33d774ede4915dbecfe920a80860bece9e3ca1fec137219009eb5e`
    - `.env.example` : `# Valeur FIXE de l'Admin token MCP complet (article : lire, créer, modifier, publier, supprimer)`
      puis `STRAPI_MCP_ADMIN_TOKEN=demo-mcp-admin-aRemplacer`
  - `STRAPI_MCP_READONLY_TOKEN=demo-mcp-readonly-02c16f0c9356687f65456b0ee5bcf61852dd6623bc1e665e29ae760904120ab0`
    - `.env.example` : `# Valeur FIXE de l'Admin token MCP en lecture seule (article : lire)`
      puis `STRAPI_MCP_READONLY_TOKEN=demo-mcp-readonly-aRemplacer`
  - Valeurs de démo générées par `openssl rand -hex 32`, fictives. Inutile de les recopier dans `frontend/.env`
    (le front n'utilise pas le MCP).
- Dépendances npm : aucune.
- Comment vérifier après application :
  `npm run demo:reset && npm run demo:start`, puis `npm run demo:check` : section `== MCP` à 4/4 OK
  (sortie attendue ci-dessous). Dans l'admin : Paramètres, Admin Tokens liste les deux tokens, Owner Camille Demo.

Sortie réelle obtenue avec ces changements (port 1338) :
```
== MCP
  [OK] MCP actif : POST /mcp sans token répond 401 (Authentication required)
  [OK] MCP : token Content API (STRAPI_READ_TOKEN) rejeté par /mcp (HTTP 401, 401 attendu)
  [OK] MCP : Admin token complet, tools/list expose 8 tools article (dont delete_article et publish_article)
  [OK] MCP : Admin token lecture seule, seulement list_article et get_article (pas de publish_article)
```
Et sans les changements (état actuel du SOCLE) :
```
== MCP
  [KO] MCP pas encore activé : POST /mcp répond HTTP 405 au lieu de 401. Passer mcp.enabled à true dans config/server.ts (docs/handoff/config-requests/mcp.md) puis redémarrer Strapi.
```

Testé : après `demo:reset` (bootstrap exécuté pendant `strapi import`), les deux tokens existent avec les
valeurs de `.env` ; un redémarrage simple ne crée pas de doublon et ne réécrit rien.

## 3. Remarque (pas de changement demandé)

`tsconfig.json` n'exclut pas `docs/` : un fichier `.ts` dans `docs/` serait compilé par `strapi develop`
(avec `noEmitOnError`). C'est pour cela que le script de l'agent MCP est en `.mjs`
(`docs/mcp/create-tokens.mjs`). Ajouter `"docs/"` à `exclude` éviterait le piège pour les autres agents.
