# Handoff SOCLE (phase 1)

> Mis à jour à l'intégration de fin de phase 2 : voir la section « Intégration » en fin de fichier
> (MCP activé, crons, webhooks signés, preview, plugin, front en mode production par défaut).

Strapi 5.54.0 (TypeScript, SQLite) a la racine du depot, front Next.js 16.3.6 dans `frontend/`.
Toutes les dependances `@strapi/*` sont epinglees en version exacte 5.54.0 (`npx strapi version` affiche `5.54.0`).

## Ce qui marche (verifie)

- **Modele** : `article` (Draft & Publish, i18n), `author`, `category` (i18n), components
  `blocks.rich-text` (body en `blocks`), `blocks.quote`, `blocks.gallery`, `shared.seo` (utilise par article ET category).
  Sur `article` : `title`, `slug`, `excerpt`, `blocks`, `seo` sont localises ; `cover` et `publishAt` sont
  partages entre locales (non localises). Relations `author` et `category` en manyToOne.
- **Admin en francais** : `src/admin/app.tsx` (`locales: ['fr']`) et l'admin de demo est cree avec
  `preferedLanguage: 'fr'`, donc l'interface s'ouvre directement en francais pour lui.
- **Bootstrap idempotent** (`src/index.ts`), execute a chaque demarrage, import et seed :
  locales fr (par defaut) + en ; super admin de demo ; 2 API tokens a valeur FIXE issue de `.env` ;
  webhook "Revalidation front Next.js" vers `FRONTEND_URL/api/revalidate` (`entry.publish`, `entry.unpublish`).
- **Seed** (`npm run seed`) : 3 auteurs, 3 categories fr/en, 7 articles :
  5 publies en fr ET en, 1 brouillon fr jamais publie (`brouillon-plugin-maison`),
  1 brouillon fr + en avec `publishAt` dans le passe (`publication-programmee`, pour CRONS).
  Images PNG generees localement (`scripts/seed/assets`, aucun telechargement), envoyees via le service upload.
- **Export versionne** : `data/demo-export.tar` (`strapi export --no-encrypt --no-compress`).
- **`npm run demo:reset`** : ~2,4 s mesure (import), ~3,7 s en repli seed. Detail plus bas.
- **`npm run demo:start`** : Strapi (`strapi develop`) + Next (`next dev`), logs prefixes `[strapi]` / `[front]`,
  Ctrl+C arrete proprement les deux.
- **`npm run demo:check`** : 8/8 OK (sortie ci-dessous), code de sortie 1 si un controle echoue.
- **Front** : scaffold `create-next-app` (TS, App Router, Tailwind, ESLint, sans `src/`, alias `@/*`),
  page d'accueil en francais, stub `components/blocks/index.tsx` exportant `Blocks({ blocks })`.
  Polices systeme (plus de Google Fonts : rien a telecharger le jour J). `tsc` et `eslint` passent.
- **Test MCP ponctuel** (demande de l'orchestrateur) : avec `mcp: { enabled: true }` dans `config/server.ts`,
  le log affiche `[MCP] Server available at /mcp` et `POST /mcp` sans token renvoie **401**
  (`{"jsonrpc":"2.0","error":{"code":-32000,"message":"Authentication required"},"id":null}`),
  et **401** aussi avec un API token Content API (le MCP exige un Admin token). Remis a `enabled: false` :
  `POST /mcp` renvoie alors **405**. C'est l'agent MCP qui l'activera via une config request.

## Demo en 60 secondes

```bash
npm run demo:reset          # < 3 s, base propre
npm run demo:start          # Strapi http://localhost:1337/admin, front http://localhost:3000
# dans un autre terminal :
source .env
curl -s 'http://localhost:1337/api/articles?populate=cover&locale=fr' -H "Authorization: Bearer $STRAPI_READ_TOKEN"
curl -s 'http://localhost:1337/api/articles?populate=cover&locale=en' -H "Authorization: Bearer $STRAPI_READ_TOKEN"
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:1337/api/articles'   # 403 : API publique fermee
npm run demo:check
```

Puis dans le navigateur : http://localhost:1337/admin, login avec l'admin de demo, Content Manager > Article :
7 articles fr (5 publies, 2 brouillons), bascule de locale en.

## Identifiants de demo (valeurs fictives, dans `.env`, non versionne)

| Quoi | Valeur |
|---|---|
| Admin | `admin@example.com` / `DemoStrapi2026!` (Camille Demo, super admin) |
| API token front | `STRAPI_READ_TOKEN` (type read-only, nom "Front (lecture seule)") |
| API token preview | `STRAPI_PREVIEW_TOKEN` (type read-only, nom "Preview (brouillons)") |
| Secret webhook | `WEBHOOK_SECRET` (pas encore envoye : attend `webhooks.defaultHeaders`) |
| Secret preview | `PREVIEW_SECRET` (racine et `frontend/.env`, pour FRONT) |

Les valeurs reelles des tokens sont dans `.env` et recopiees dans `frontend/.env`.

**Tokens a valeur fixe** : `create()` de `@strapi/admin` genere toujours une cle aleatoire (verifie dans
`node_modules/@strapi/admin/dist/server/server/src/services/api-token.js`, pas d'option accessKey).
Le bootstrap cree donc le token via le service officiel, puis reecrit `accessKey` (hash HMAC calcule par le
service avec `API_TOKEN_SALT`) et `encryptedKey` (service de chiffrement, `ENCRYPTION_KEY`) via le Query Engine.
Le token est donc stable d'un reset a l'autre et visible dans Parametres > API Tokens.

Strapi cree aussi, sur une base vide, ses 2 tokens par defaut "Read Only" et "Full Access" (valeurs aleatoires) :
ils sont inoffensifs, ne pas s'en servir.

**Preview** : en Strapi 5 un token read-only lit les brouillons avec `?status=draft` ; le token preview n'a pas
plus de droits que le token front, il est separe pour la tracabilite et la rotation.

**API publique fermee** : aucune permission n'est donnee au role Public ; tout passe par le token (403 sans token).

## demo:reset : comment et pourquoi

1. Refuse si un serveur ecoute deja sur `PORT` (supprimer la base SQLite sous un Strapi lance casse tout).
2. Supprime `.tmp/data.db*` et `public/uploads/*`.
3. `strapi import -f data/demo-export.tar --force`. L'export n'embarque ni les admins ni les API tokens :
   le bootstrap, qui s'execute pendant l'import sur la base neuve, recree admin, locales, tokens et webhook.
4. **Repli automatique** : si l'import echoue (schemas modifies depuis l'export, par ex. apres CONTENU),
   la base est recreee par `npm run seed` (Document Service), puis un message invite a lancer `npm run demo:export`.

Mesures reelles : import 2,4 s (dist deja compile), 6,4 s au premier lancement (compilation TS), seed complet 3,7 s.
Pas besoin du repli "snapshot .tmp/data.db".

`npm run demo:export` regenere `data/demo-export.tar` depuis la base courante (a faire sur une base issue d'un
`demo:reset` pour que l'export reste propre).

## Ce qui casse si on touche a quoi

- **Un schema** (`src/api/**/schema.json`, `src/components/**`) : l'import de `data/demo-export.tar` echoue
  (schemas differents) et `demo:reset` passe en seed (plus lent mais OK). Regenerer l'export : `npm run demo:reset && npm run demo:export`.
  Supprimer ou renommer un champ utilise par `scripts/seed/index.ts` (title, slug, cover, excerpt, author, category,
  blocks, seo, publishAt, champs des components) casse le seed : l'adapter dans le meme commit.
- **`API_TOKEN_SALT` ou `ENCRYPTION_KEY`** : le bootstrap realigne les tokens au demarrage suivant, mais seulement
  s'il tourne (restart necessaire) ; changer `STRAPI_READ_TOKEN` impose de mettre a jour `frontend/.env`.
- **Nom des tokens ou du webhook** dans `src/index.ts` : le bootstrap les retrouve par leur nom ; renommer = doublons.
- **`FRONTEND_URL`** : l'URL du webhook est realignee au demarrage.
- **`frontend/next.config.ts`** : `agentRules: false` empeche `next dev` de reecrire `frontend/AGENTS.md` avec un
  tiret cadratin (sinon `demo:check` passe au rouge). `turbopack.root` evite l'avertissement des deux lockfiles.
- **`config/admin.ts` `watchIgnoreFiles`** : sans lui, toute modif dans `frontend/`, `scripts/`, `docs/` ou `data/`
  redemarre Strapi en plein milieu de la demo.
- **Port 1337** : a l'heure du test, 1337 etait occupe par un autre projet de la machine (`ghorza/apps/cms`,
  `strapi develop`). Je n'y ai pas touche ; tous mes tests ont tourne sur 1350/3010. Il faudra le liberer pour
  l'integration et le jour J (sinon `demo:reset` refuse et `demo:start` echoue sur 1337).

## Phase 2 : lancer sa propre instance dans son worktree

Chaque worktree a sa base (`.tmp/` est ignore par git) et ses uploads. Exemple pour l'agent MCP :

```bash
npm install && npm --prefix frontend install      # node_modules ne sont pas partages entre worktrees
cp ../<depot principal>/.env .env                 # ou recopier .env.example et remplir
cp ../<depot principal>/frontend/.env frontend/.env
PORT=1338 npm run demo:reset
PORT=1338 FRONT_PORT=3001 npm run demo:start
PORT=1338 FRONT_PORT=3001 npm run demo:check
```

`demo:start` transmet `PORT` a Strapi, `FRONT_PORT` a Next, `STRAPI_URL=http://localhost:$PORT` au front et
`FRONTEND_URL=http://localhost:$FRONT_PORT` a Strapi (le webhook pointe alors sur le bon front).
Ports attribues : MCP 1338, WEBHOOKS 1339, CRONS 1340, CONTENU 1341, PLUGIN 1342, FRONT 1343 ; Next 3001 a 3006.

## Ajouter un check

Creer `scripts/checks/<agent>.ts` (charge automatiquement, par ordre alphabetique) :

```ts
import type { CheckFn } from './types';

const check: CheckFn = async (ctx) => {
  const res = await ctx.fetchJson('/api/articles?locale=fr', { token: ctx.env.STRAPI_READ_TOKEN });
  return { ok: res.status === 200, message: 'Message lisible en francais' };
};
export default check;
```

`ctx` fournit `root`, `env` (.env fusionne avec l'environnement), `strapiUrl`, `frontendUrl`, `fetchJson`
(Bearer via `token`) et `adminJwt()` (login de l'admin de demo). Renvoyer un resultat ou un tableau ;
une exception compte comme KO. Exemple reel : `scripts/checks/socle.ts` (version Strapi >= 5.47.0 pour le MCP).

## Ajouter un seed

Creer `scripts/seed/<agent>.ts` (charge automatiquement apres le seed SOCLE, ordre alphabetique) :

```ts
import type { SeedFn } from './lib/helpers';

const seed: SeedFn = async ({ strapi, helpers }) => {
  const image = await helpers.uploadImage('cover-1.png', 'Texte alternatif');   // fichier de scripts/seed/assets
  await strapi.documents('api::article.article').create({
    locale: 'fr',
    data: { title: 'Mon article', slug: 'mon-article', cover: image.id, blocks: [] },
    status: 'published',
  });
};
export default seed;
```

Toujours le Document Service, jamais de SQL. Apres un nouveau seed : `npm run demo:reset` (qui bascule en seed
si les schemas ont change) puis `npm run demo:export` pour figer l'export (a faire par le SOCLE a l'integration).

## Config requests

Voir `docs/handoff/config-requests/README.md`. Emplacements deja prevus et commentes :
`config/server.ts` (`mcp`, `cron`, `webhooks.defaultHeaders`) et `config/admin.ts` (`preview`).

## Sorties reelles

`time PORT=1350 npm run demo:reset` :

```
[reset] Base et uploads supprimes (0.0 s)
[reset] Restauration de data/demo-export.tar via strapi import...
[reset] Termine en 2.2 s (mode : import). Lancer ensuite : npm run demo:start
PORT=1350 npm run demo:reset  3.52s user 0.40s system 164% cpu 2.381 total
```

`PORT=1350 FRONT_PORT=3010 npm run demo:check` :

```
== SOCLE
  [OK] Strapi repond sur http://localhost:1350 (HTTP 204)
  [OK] API fr : 5 article(s) publie(s), 5 avec cover (token lecture seule)
  [OK] API en : 5 article(s) publie(s), 5 avec cover (token lecture seule)
  [OK] Token preview : 7 version(s) brouillon lisible(s) avec status=draft, contre 5 publiee(s)
  [OK] Admin admin@example.com : login OK, Content Manager liste 7 article(s) fr (HTTP 200)
  [OK] Webhook "Revalidation front Next.js" vers http://localhost:3010/api/revalidate (entry.publish, entry.unpublish)
  [OK] Aucun tiret cadratin (U+2014) dans le depot
  [OK] Version Strapi 5.54.0 (>= 5.47.0 requise pour le serveur MCP)

Tout est vert : 8/8 OK
```

## Intégration (fin de phase 2)

Passe faite dans le dépôt principal, Strapi 1337 et Next 3000. Historique linéaire, un commit par agent
(cherry-pick sans aucun conflit), puis ce commit SOCLE.

### Ce qui a été appliqué

- **MCP** : `mcp: { enabled: true }` (config/server.ts) ; `ensureMcpAdminTokens()` dans src/index.ts,
  appelé après `ensureDemoAdmin` (Admin tokens « MCP Claude Code (complet) » et « MCP lecture seule »,
  valeurs fixes `STRAPI_MCP_ADMIN_TOKEN` / `STRAPI_MCP_READONLY_TOKEN` dans .env et .env.example) ;
  `docs/` exclu de tsconfig.json.
- **WEBHOOKS** : `webhooks.defaultHeaders` = `Authorization: Bearer WEBHOOK_SECRET` ; `populateRelations`
  supprimé (option retirée en Strapi 5) ; script `npm run webhooks:simulate`.
- **demo:start** : le front tourne par défaut en **mode production** (`next build` puis `next start`),
  seul mode où le cache de données et la revalidation par webhook se voient. `npm run demo:start:dev`
  (ou `FRONT_MODE=dev`) lance `next dev` pour développer. Vérifié : `next build` n'interroge pas Strapi
  (build réussi en 4,3 s avec le port 1337 fermé, toutes les pages en « ƒ Dynamic »), il tourne donc en
  parallèle du démarrage de Strapi. Front et Strapi prêts 7 s après le lancement.
- **CRONS** : `import cronTasks from './cron-tasks'` et `cron: { enabled: true, tasks: cronTasks }`.
- **FRONT** : bloc `preview` dans config/admin.ts (handler et `allowedOrigins` tels que demandés) ;
  `PREVIEW_ENABLED` optionnelle documentée dans .env.example.
- **PLUGIN** : devDependency exacte `@strapi/sdk-plugin` 6.1.1 ; scripts `plugin:build`, `plugin:watch`,
  `postinstall`, `predemo:reset`, `predemo:start` (et `predemo:start:dev`), `predevelop`, `predev`,
  `prebuild` ; `editorial-toolkit` déclaré dans config/plugins.ts ; attribut `tone` (custom field
  `plugin::editorial-toolkit.tone`) après `excerpt` dans le schéma article ; snippet de seed appliqué
  (ton rempli sur les articles publiés, brouillons sans ton).
- **CONTENU** : export régénéré (procédure de config-requests/contenu.md) ; `types/generated/components.d.ts`
  et `contentTypes.d.ts` régénérés par `strapi develop` et commités.
- **.gitignore** : `.claude/worktrees/` ajouté (`logs` et `*.log` déjà présents).
- **demo:check** :
  - `FRONT_PORT` l'emporte sur `FRONTEND_URL` (même priorité que demo:start) ;
  - `.claude/` exclu de la recherche du tiret cadratin ;
  - **un seul login admin** pour tous les contrôles, et le JWT est gardé dans
    `.tmp/demo-check-admin-jwt-<port>` : il est réutilisé tant que `GET /admin/users/me` répond 200,
    sinon (base remise à zéro) un nouveau login est fait. Mesuré : 3 exécutions de demo:check = 1 seul
    `POST /admin/login`. Le login admin est limité à 5 essais par 5 min (`rateLimit` par défaut :
    e-mail + chemin + IP, stockage en mémoire, remis à zéro au redémarrage de Strapi) ;
  - les résultats de scripts/checks/socle.ts s'affichent dans la section SOCLE du début.
- **Accents** : seed (titres, extraits, corps, citations, bios, catégorie « Éditorial », textes alternatifs
  qui reprennent les titres), messages de demo:reset, demo:start, demo:check, scripts/checks/socle.ts,
  logs du bootstrap (`[socle] admin de démo créé`, etc.). Les slugs sont inchangés.

### Sorties réelles

`time npm run demo:reset` (mode import, build du plugin compris) :

```
[reset] Base et uploads supprimés (0.0 s)
[reset] Restauration de data/demo-export.tar via strapi import...
[reset] Terminé en 2.2 s (mode : import). Lancer ensuite : npm run demo:start
npm run demo:reset  9.32s user 0.78s system 205% cpu 4.927 total
```

(4,9 à 5,2 s au total sur 4 mesures, dont environ 2,5 s de build du plugin par `predemo:reset`.)
Régénération de l'export : seed complet 4,6 s (mode seed), puis `npm run demo:export`.

`npm run demo:check` après `npm run demo:reset && npm run demo:start` (attendre le premier passage du cron,
30 s au plus) ; la deuxième passe, lancée juste après, est identique à la seconde près du log des crons :

```
Vérification de la démo (Strapi : http://localhost:1337, front : http://localhost:3000)

== SOCLE
  [OK] Strapi répond sur http://localhost:1337 (HTTP 204)
  [OK] API fr : 7 article(s) publié(s), 7 avec image de couverture (token lecture seule)
  [OK] API en : 7 article(s) publié(s), 7 avec image de couverture (token lecture seule)
  [OK] Token preview : 8 version(s) brouillon lisible(s) avec status=draft, contre 7 publiée(s)
  [OK] Admin admin@example.com : login OK, Content Manager liste 8 article(s) fr (HTTP 200)
  [OK] Webhook "Revalidation front Next.js" vers http://localhost:3000/api/revalidate (entry.publish, entry.unpublish)
  [OK] Aucun tiret cadratin (U+2014) dans le dépôt
  [OK] Version Strapi 5.54.0 (5.47.0 minimum requise pour le serveur MCP)
== CONTENU
  [OK] Components présents : blocks.rich-text, blocks.quote, blocks.gallery, shared.seo
  [OK] Article composé publié en fr : 3 bloc(s) (blocks.rich-text, blocks.quote, blocks.gallery), 3 image(s) de galerie, SEO rempli (populate du contrat FRONT)
  [OK] Article composé publié en en : 3 bloc(s) (blocks.rich-text, blocks.quote, blocks.gallery), 3 image(s) de galerie, SEO rempli (populate du contrat FRONT)
== CRONS
  [OK] Cron activé, tâches déclarées : publishScheduledArticles, draftsDigest (mode démo : 30 s et 1 min)
  [OK] logs/crons.log écrit il y a 5 s (maximum attendu : 90 s)
  [OK] Aucun brouillon en retard : tout article dont publishAt est passé est publié
== FRONT
  [OK] Front http://localhost:3000/ : HTTP 200
  [OK] Liste fr : 7 titre(s) publie(s) affiche(s)
  [OK] Detail /articles/pourquoi-un-cms-headless : HTTP 200
  [OK] Apercu du brouillon brouillon-plugin-maison : sans apercu HTTP 404, /api/preview HTTP 307 + cookie, avec apercu HTTP 200 + bandeau, mauvais secret HTTP 401
== MCP
  [OK] MCP actif : POST /mcp sans token répond 401 (Authentication required)
  [OK] MCP : token Content API (STRAPI_READ_TOKEN) rejeté par /mcp (HTTP 401, 401 attendu)
  [OK] MCP : Admin token complet, tools/list expose 8 tools article (dont delete_article et publish_article)
  [OK] MCP : Admin token lecture seule, seulement list_article et get_article (pas de publish_article)
== PLUGIN
  [OK] Plugin editorial-toolkit compilé (dist/server et dist/admin présents)
  [OK] Plugin chargé : « Boîte à outils éditoriale » listé par GET /admin/plugins
  [OK] Custom field plugin::editorial-toolkit.tone enregistré (type natif string)
  [OK] Article utilise le custom field dans l’attribut « tone »
  [OK] Tableau de bord : 15 article(s) (fr 8, en 7), 0 brouillon(s) prêt(s) à publier, 1 à compléter
  [OK] MCP : tool editorial_checklist listé (4 tools pour un jeton lecture articles)
== WEBHOOKS
  [OK] http://localhost:3000/api/revalidate sans secret : HTTP 401 (401 attendu)
  [OK] Publication simulée d'un article : HTTP 200, tags revalidés : articles, article:revalidation-a-la-demande
  [OK] entry.update simulé : HTTP 200, ignoré, rien de revalidé

Tout est vert : 31/31 OK
```

Lancé moins de 30 s après demo:start, CRONS affiche 2 KO (`logs/crons.log absent`, brouillon en retard) :
c'est attendu, il suffit d'attendre le premier passage du cron.

### Tests réels de bout en bout (1337 / 3000, front en mode production)

1. **Publication, webhook, front** : titre de « Strapi et les agents IA via MCP » modifié via
   `PUT /content-manager/collection-types/api::article.article/<documentId>?locale=fr` : le front garde
   l'ancien titre (brouillon, pas de webhook), puis `POST .../actions/publish?locale=fr` : au rechargement
   suivant, la liste (h2) et le détail (h1) affichent « Strapi et les agents IA via MCP : édition en direct ».
   Log : `[front] [webhook] entry.publish article "Strapi et les agents IA via MCP : édition en direct" (fr) -> tags revalidés : articles, article:strapi-et-les-agents-ia`.
2. **Cron** : `npx tsx scripts/crons/schedule-demo-article.ts` : brouillon créé à 11:50:13 (parution prévue
   11:50:33), publié par le cron à 11:51:00 (`Publié ! GET /api/articles?locale=fr le renvoie`), webhook reçu,
   titre présent dans la liste du front.
3. **Contenu** : bloc `blocks.quote` ajouté à « Pourquoi un CMS headless ? » via l'API admin, publié : la
   citation « Une citation ajoutée en direct depuis l'admin, sans redémarrer le front. » (auteur, rôle)
   apparaît dans le HTML de /articles/pourquoi-un-cms-headless sans redémarrage.
4. **MCP** : `bash docs/mcp/mcp-curl.sh` (port 1337 par défaut, adapté tel quel) : 401 avec
   `STRAPI_READ_TOKEN` ; token complet : 8 tools article + `editorial_checklist` + `log` ; brouillon créé par
   `create_article`, visible en tête du Content Manager (status draft) ; token lecture seule :
   `Tool publish_article disabled`. `editorial_checklist` sur ce brouillon : « 0/6 critères remplis ».
   Preview : `GET /content-manager/preview/url/...` renvoie l'URL `/api/preview?...&status=draft`,
   CSP de l'admin `frame-src http://localhost:3000`.

La base a été remise à zéro après ces tests (`npm run demo:reset`), les ports 1337 et 3000 sont libres.

### Écarts et points connus

- `scripts/checks/front.ts` (FRONT) affiche encore « publie(s) affiche(s) », « Detail », « Apercu » sans
  accents : fichier d'un autre agent, non bloquant, je n'y ai pas touché.
- L'autrice « Ines Carvalho » garde son nom sans accent : `scripts/seed/contenu.ts` la retrouve par ce nom.
- Les handoffs des autres agents citent les anciens titres non accentués dans leurs sorties historiques.
- Le login admin (5 par 5 min) est partagé entre le navigateur du présentateur, `schedule-demo-article.ts`
  et `mcp-curl.sh` (chacun fait son login) ; demo:check n'en consomme plus qu'un après chaque reset.
  En cas de 429 : attendre 5 min ou redémarrer Strapi.
- L'article `publication-programmee` du seed est publié dans les 30 s qui suivent demo:start (noté par CRONS) :
  pour montrer le cron en direct, utiliser `schedule-demo-article.ts`.
- Le contrôle PLUGIN crée à chaque passage un Admin token « Contrôle demo:check (plugin éditorial) ».

### À vérifier à l'œil par un humain (non testable par curl)

- Bouton **Aperçu** du Content Manager sur « Brouillon : écrire son propre plugin » : iframe du front avec
  le bandeau « Mode aperçu : brouillon ».
- Parcours de clics complet dans l'admin (édition, publication, champ Ton éditorial, panneau check-list,
  tableau de bord du plugin), admin en français.
- Thème clair de l'admin et du front au projecteur ; rendu du plugin (tableau de bord, badges) en résolution
  de projecteur (1280 x 720 ou 1920 x 1080).
