# Handoff SOCLE (phase 1)

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
