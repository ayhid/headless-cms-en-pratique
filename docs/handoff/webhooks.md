# Handoff WEBHOOKS (phase 2)

Publication dans Strapi -> webhook -> `POST /api/revalidate` côté Next.js -> `revalidateTag` sur
`articles` et `article:<slug>` -> la page suivante est rendue avec les données fraîches, sans redémarrage.

Fichiers : `frontend/app/api/revalidate/route.ts`, `scripts/webhooks/lib.ts`,
`scripts/webhooks/simulate-publish.ts`, `scripts/checks/webhooks.ts`, `docs/webhooks/admin.md`,
config request `docs/handoff/config-requests/webhooks.md`.

## Ce qui marche (vérifié sur Strapi 1339 + Next 3002 en `next build && next start`)

- **Authentification** : header `Authorization` comparé à `Bearer ${WEBHOOK_SECRET}` à temps constant
  (`timingSafeEqual` sur deux empreintes SHA-256, donc longueur fixe). Absent ou faux : **401**.
  `WEBHOOK_SECRET` absent de `frontend/.env` : 500 et log explicite.
- **Filtrage** : l'événement est lu dans `X-Strapi-Event` (repli sur `event` du corps). Seuls `entry.publish` et
  `entry.unpublish` avec `model === 'article'` (ou `uid === 'api::article.article'`) revalident. Tout le reste
  (entry.update, trigger-test, media.*, autres modèles) : **200** `{ revalidated: false, ignored: true }` et log « ignoré ».
- **Tags** : `articles` et `article:<entry.slug>`. Le slug est celui de la locale publiée : publier la version en
  revalide `article:strapi-and-ai-agents`, la version fr `article:strapi-et-les-agents-ia` (vérifié, voir les logs).
- **Logs** : une ligne par événement, préfixe `[webhook]`, en français.
- **Test de bout en bout réel** : page temporaire (supprimée depuis) qui fetch avec `cache: 'force-cache'` et
  `next: { tags }`, publication réelle via l'API admin du Content Manager
  (`POST /content-manager/collection-types/api::article.article/<documentId>/actions/publish?locale=fr`, JWT admin).
  Résultat : la page change au rechargement suivant, sans redémarrage. Contre-épreuve sans `defaultHeaders` :
  401 dans le log et page restée périmée.
- **Simulation** et **check** : 3/3 et `demo:check` 11/11 (sorties plus bas).

## Signature de `revalidateTag` retenue : `revalidateTag(tag, { expire: 0 })`

Doc lue dans la version installée (`frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`,
Next 16.3.6). Signature déclarée dans `next/dist/server/web/spec-extension/revalidate.d.ts` :
`revalidateTag(tag: string, profile: string | CacheLifeConfig): undefined`.

Citations :
- « **`{ expire: 0 }`**: Stale content is never served, so the next request is a blocking revalidate/cache miss.
  Use it when the caller needs the data gone immediately and you cannot use `updateTag`. »
- « When the invalidation comes from outside a Server Action, for example a webhook or another service calling a
  Route Handler, `updateTag` is not available. Pass `{ expire: 0 }` to expire the data immediately »
- `updateTag.md` : « `updateTag` can **only** be called from within Server Actions. It cannot be used in Route Handlers ».
- La forme à un argument est dépréciée : « The single-argument form `revalidateTag(tag)` is deprecated ».

Pourquoi pas `'max'` (recommandé par la doc en général) : il sert le contenu périmé pendant la revalidation
(stale-while-revalidate), donc le premier rechargement après publication montrerait encore l'ancienne version.
En démo, on veut la nouvelle version dès le premier rechargement : `{ expire: 0 }`, vérifié.

## Démo en 60 s

Prérequis : config request appliquée (`webhooks.defaultHeaders`), Strapi redémarré, front en **production**
(`cd frontend && npm run build && npm run start`, voir « mode dev » plus bas), une page du front qui liste les articles.

1. Ouvrir la page d'accueil du front, montrer la liste. Recharger : rien ne change (cache).
2. Dans l'admin : Content Manager > Article > un article publié, modifier le titre, cliquer sur **Publier**.
3. Montrer le terminal du front :
   `[webhook] entry.publish article "Nouveau titre" (fr) -> tags revalidés : articles, article:<slug>`
4. Recharger la page du front : nouveau titre, sans redémarrage.
5. (Bonus 10 s) `npm run webhooks:simulate` (ou `npx tsx scripts/webhooks/simulate-publish.ts`) : 200 / 401 / ignoré.

Plan B si le webhook ne part pas : la simulation (étape 5) revalide réellement les mêmes tags
(slug `revalidation-a-la-demande`) et montre le même log.

## Ce qui casse si on touche à quoi

- **`WEBHOOK_SECRET`** : doit être identique dans `.env` (lu par Strapi via `defaultHeaders`) et `frontend/.env`
  (lu par la route). Changer l'un sans l'autre, ou oublier `defaultHeaders` : 401 à chaque publication, la page
  ne bouge plus. Changer le secret impose de redémarrer Strapi ET Next (`next start` lit l'environnement au démarrage).
- **En-tête saisi dans l'admin** : un en-tête `Authorization` ajouté dans le formulaire du webhook écrase celui de
  `defaultHeaders` (doc : « This option is overwritten by the headers set in the webhook itself »). Laisser vide.
- **Noms de tags** : `articles` et `article:<slug>` sont écrits en dur dans la route et doivent être exactement ceux
  que FRONT pose dans `next: { tags }` (sensible à la casse). Un tag différent : aucune erreur, simplement rien n'est revalidé.
- **Mode dev vs prod** : en `next dev`, les pages sont rendues à chaque requête et un rechargement forcé
  (`cache-control: no-cache`) ignore `next.tags` (doc Next citée dans la config request, vérifié : la requête
  repart vers Strapi). La page paraît donc à jour même sans webhook : la démo ne prouve rien. Faire la démo en
  `next build && next start`.
- **Événements du webhook** : ne cocher que Publier / Annuler la publication (bootstrap du SOCLE). Ajouter
  « Mettre à jour » ne casse rien (ignoré) mais double les lignes de log, car publier envoie aussi `entry.update`
  juste avant `entry.publish` (doc Strapi : « Publishing an entry saves its draft first »).
- **Renommer le modèle `article`** ou changer son uid : la route ignore tout.
- **Changer le slug puis publier** : le payload ne contient que le nouveau slug, donc `article:<ancien-slug>` n'est
  pas revalidé ; l'ancienne URL de détail reste en cache. La liste (`articles`) est bien revalidée. Sans importance
  pour la démo, à savoir si on modifie le slug en direct.
- **Déploiement multi-instances** : non concerné ici (une seule instance `next start`, cache local).

## Ce que FRONT doit respecter

- Toute requête Strapi à mettre en cache : `cache: 'force-cache'` **explicite** et `next: { tags: [...] }`.
  Doc fetch : « Caching is opt-in. Set `cache: 'force-cache'` to cache any request, including [...] requests that
  send `authorization` [...] headers. » Sans `force-cache`, rien n'est mis en cache, donc rien à revalider.
- Liste : tag `articles`. Détail : tags `article:<slug>` (slug de la locale affichée) ; ajouter aussi `articles`
  au détail est inoffensif.
- Ne pas mettre de tag de liste différent par locale (`articles:fr`...) sans me prévenir : la route ne revalide que `articles`.
- Draft Mode contourne le cache (doc : « Draft Mode bypasses the cache entirely »), la preview n'est donc pas concernée.
- Ne pas créer d'autre route sous `frontend/app/api/revalidate/` (propriété WEBHOOKS).

## Sorties réelles

Publication réelle depuis l'API du Content Manager, page temporaire interrogée avant / après (Next en `next start`) :

```
HTTP 200 Revalidation à la demande avec Next.js (mise à jour en direct)     <- entry.update seul (titre modifié)
rendu   : Rendu à 2026-09-23T09:09:06.921Z
liste   : [..., 'Revalidation a la demande avec Next.js', ...]              <- inchangé, normal
--- publication
HTTP 200 Revalidation à la demande avec Next.js (mise à jour en direct)
rendu   : Rendu à 2026-09-23T09:09:40.304Z
liste   : [..., 'Revalidation à la demande avec Next.js (mise à jour en direct)', ...]
détail  : Revalidation à la demande avec Next.js (mise à jour en direct)
--- publication du brouillon
liste   : ['Brouillon : ecrire son propre plugin', ...]                     <- 6 articles
--- dépublication
liste   : [...]                                                               <- 5 articles
```

Contre-épreuve sans `webhooks.defaultHeaders` puis avec (même article, titre modifié) :

```
--- modification + publication SANS defaultHeaders
HTTP 200 Strapi et les agents IA via MCP (titre modifié)
liste   : [..., 'Strapi et les agents IA via MCP']                            <- périmé
[webhook] refusé : header Authorization absent ou secret invalide (401)
--- publication AVEC defaultHeaders
liste   : [..., 'Strapi et les agents IA via MCP (titre modifié)']            <- à jour
[webhook] entry.publish article "Strapi et les agents IA via MCP (titre modifié)" (fr) -> tags revalidés : articles, article:strapi-et-les-agents-ia
[webhook] entry.publish article "Strapi and AI agents through MCP" (en) -> tags revalidés : articles, article:strapi-and-ai-agents
```

Logs du front pendant les publications réelles :

```
[webhook] entry.publish article "Revalidation à la demande avec Next.js (mise à jour en direct)" (fr) -> tags revalidés : articles, article:revalidation-a-la-demande
[webhook] entry.publish article "Brouillon : ecrire son propre plugin" (fr) -> tags revalidés : articles, article:brouillon-plugin-maison
[webhook] entry.unpublish article "Brouillon : ecrire son propre plugin" (fr) -> tags revalidés : articles, article:brouillon-plugin-maison
```

Bouton « Déclencheur » (même appel que l'admin, `POST /admin/webhooks/:id/trigger`) :

```
HTTP 200 {"data": {"statusCode": 200}}
[webhook] trigger-test -> ignoré (seuls entry.publish et entry.unpublish d'un article revalident)
```

`FRONT_PORT=3002 npx tsx scripts/webhooks/simulate-publish.ts` :

```
Simulation du webhook Strapi vers http://localhost:3002/api/revalidate

[OK] publication simulée (bon secret) : HTTP 200 {"revalidated":true,"event":"entry.publish","tags":["articles","article:revalidation-a-la-demande"],"now":1790154951303}
[OK] mauvais secret : HTTP 401 {"error":"Non autorisé"}
[OK] entry.update (doit être ignoré) : HTTP 200 {"revalidated":false,"ignored":true,"event":"entry.update","model":"article"}

Les 3 cas se comportent comme prévu.
```

`PORT=1339 FRONT_PORT=3002 npm run demo:check` :

```
== SOCLE
  [OK] Strapi repond sur http://localhost:1339 (HTTP 204)
  [OK] API fr : 5 article(s) publie(s), 5 avec cover (token lecture seule)
  [OK] API en : 5 article(s) publie(s), 5 avec cover (token lecture seule)
  [OK] Token preview : 7 version(s) brouillon lisible(s) avec status=draft, contre 5 publiee(s)
  [OK] Admin admin@example.com : login OK, Content Manager liste 7 article(s) fr (HTTP 200)
  [OK] Webhook "Revalidation front Next.js" vers http://localhost:3002/api/revalidate (entry.publish, entry.unpublish)
  [OK] Aucun tiret cadratin (U+2014) dans le depot
  [OK] Version Strapi 5.54.0 (>= 5.47.0 requise pour le serveur MCP)
== WEBHOOKS
  [OK] http://localhost:3002/api/revalidate sans secret : HTTP 401 (401 attendu)
  [OK] Publication simulée d'un article : HTTP 200, tags revalidés : articles, article:revalidation-a-la-demande
  [OK] entry.update simulé : HTTP 200, ignoré, rien de revalidé

Tout est vert : 11/11 OK
```

Le check WEBHOOKS a besoin du front lancé ; sinon il affiche `[KO] Front injoignable sur ... : lancer npm run demo:start`.
Il ne se connecte pas à l'admin (pas de risque de 429 : le login admin est limité en fréquence, constaté après
une dizaine de connexions rapprochées).
