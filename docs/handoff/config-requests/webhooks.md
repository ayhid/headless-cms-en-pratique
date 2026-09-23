# Config request : WEBHOOKS

> **Monorepo Turborepo (23/09)** : Strapi vit désormais dans `apps/backend/` et le front dans `apps/frontend/`.
> Les chemins de ce document ont été réécrits en conséquence ; un `.env` sans préfixe désigne `apps/backend/.env`.
> Les commandes `npm run ...` se lancent depuis la racine du dépôt ; les extraits de `package.json` cités plus bas
> sont ceux de `apps/backend/package.json`. `scripts/demo-start.mts` n'existe plus : `npm run demo:start` passe par
> turbo. Détails : `docs/handoff/socle.md`, section « Monorepo Turborepo ».

## 1. apps/backend/config/server.ts
- Pourquoi : Strapi doit envoyer `Authorization: Bearer <WEBHOOK_SECRET>` à chaque appel de webhook,
  sinon la route `apps/frontend/app/api/revalidate` répond 401 et rien n'est revalidé (vérifié : log
  `[webhook] refusé : header Authorization absent ou secret invalide (401)` et page restée périmée).
  Forme exacte d'après https://docs.strapi.io/cms/backend-customization/webhooks (section « Webhooks security »).
- Changement exact : remplacer la ligne de commentaire `// [config request WEBHOOKS] ...` par la ligne active,
  le bloc devient :
```ts
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    defaultHeaders: { Authorization: `Bearer ${env('WEBHOOK_SECRET')}` },
  },
```
- Facultatif (nettoyage) : `populateRelations` n'existe plus en Strapi 5. La doc webhooks le dit :
  « The `webhooks.populateRelations` option of Strapi 4 was removed in Strapi 5 ». La ligne est sans effet,
  on peut la supprimer (je ne l'ai pas supprimée pendant mes tests : ils ont tourné avec).
- Variables d'environnement nouvelles : aucune. `WEBHOOK_SECRET` existe déjà dans `.env` et `apps/frontend/.env` ;
  **les deux valeurs doivent être identiques**.
- Dépendances npm : aucune.
- Après application : **redémarrer Strapi** (config lue au démarrage ; pendant mes tests, `strapi develop` n'a pas
  redémarré tout seul après la modification de `apps/backend/config/server.ts`).
- Comment vérifier : publier un article dans le Content Manager, le terminal du front affiche
  `[webhook] entry.publish article "<titre>" (fr) -> tags revalidés : articles, article:<slug>`.
  Ou dans l'admin : Paramètres > Webhooks > « Revalidation front Next.js » > **Déclencheur** : le front logue
  `[webhook] trigger-test -> ignoré (...)` (200, donc le secret passe).

## 2. package.json (racine)
- Pourquoi : lancer la simulation sans retenir le chemin du script.
- Changement exact, dans `scripts` :
```json
"webhooks:simulate": "tsx scripts/webhooks/simulate-publish.ts",
```
- Comment vérifier : front lancé, `npm run webhooks:simulate` affiche 3 lignes `[OK]` et « Les 3 cas se comportent comme prévu. »

## 3. Démo du webhook : front en mode production (apps/backend/scripts/demo-start.mts ou DEMO.md)
- Pourquoi : `demo:start` lance `next dev`. En dev, la doc Next 16.3 dit « In Development, Pages are _always_
  rendered on-demand and are never cached » (`guides/caching-without-cache-components.md`) et
  « if the request includes the `cache-control: no-cache` header, `options.cache`, `options.next.revalidate`,
  and `options.next.tags` are ignored » (`api-reference/functions/fetch.md`) : un rechargement forcé du navigateur
  montre la nouvelle version **même sans webhook**. Vérifié : en dev, un appel avec `cache-control: no-cache`
  a bien refait la requête vers Strapi. La démo « le webhook met la page à jour » ne prouve donc rien en dev.
- Proposition (au choix du SOCLE / RUNBOOK, je ne touche pas à ces fichiers) : variable `FRONT_MODE=prod` dans
  `apps/backend/scripts/demo-start.mts` qui remplace la commande du front par
  `npm run build && npm run start` (`next start` lit `PORT`, comme `next dev`). Exemple :
```ts
      command: env.FRONT_MODE === 'prod' ? 'npm run build && npm run start' : 'npm run dev',
```
  Attention : `next build` interroge Strapi pendant le build (pages statiques), Strapi doit donc déjà répondre ;
  sinon lancer le build après le démarrage de Strapi, ou prévoir un build à part dans la checklist J-30 min.
- Comment vérifier : procédure « Démo en 60 s » de `docs/handoff/webhooks.md`.

## 4. apps/backend/scripts/demo-check.ts (remarque, pas bloquant)
- `frontendUrl` vaut `FRONTEND_URL || FRONT_PORT` : comme `FRONTEND_URL` est dans `.env`, `FRONT_PORT=3002` est
  ignoré par `demo:check` (alors que `demo:start` donne la priorité à `FRONT_PORT`). Mon check contourne le problème
  (`frontendUrlFrom` dans `apps/backend/scripts/webhooks/lib.ts` applique la même priorité que `demo:start`). Pour aligner :
```ts
const frontendUrl = env.FRONT_PORT ? `http://localhost:${env.FRONT_PORT}` : env.FRONTEND_URL || 'http://localhost:3000';
```
