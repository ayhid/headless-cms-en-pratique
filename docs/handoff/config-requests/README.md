# Config requests

> **Monorepo Turborepo (23/09)** : Strapi vit désormais dans `apps/backend/` et le front dans `apps/frontend/`.
> Les chemins de ce document ont été réécrits en conséquence ; un `.env` sans préfixe désigne `apps/backend/.env`.
> Les commandes `npm run ...` se lancent depuis la racine du dépôt ; les extraits de `package.json` cités plus bas
> sont ceux de `apps/backend/package.json`. `scripts/demo-start.mts` n'existe plus : `npm run demo:start` passe par
> turbo. Détails : `docs/handoff/socle.md`, section « Monorepo Turborepo ».

Les fichiers de configuration partages appartiennent au SOCLE : `package.json` (racine et `apps/frontend/`),
`.env` / `.env.example`, `apps/backend/config/server.ts`, `apps/backend/config/admin.ts`, `apps/backend/config/plugins.ts`,
`apps/backend/config/database.ts`, `apps/backend/config/middlewares.ts`, `apps/backend/src/index.ts`.

Un agent de phase 2 qui a besoin d'y toucher ne les modifie PAS dans son commit (sauf pour ses
tests locaux, a ne pas commiter). Il depose une demande dans ce dossier :
`docs/handoff/config-requests/<agent>.md` (ex. `mcp.md`, `webhooks.md`, `crons.md`, `front.md`).
Le SOCLE les applique toutes en une fois lors de la passe d'integration.

## Format

````markdown
# Config request : <AGENT>

## 1. <fichier cible, ex. apps/backend/config/server.ts>
- Pourquoi : <une phrase>
- Changement exact (a coller tel quel) :
```ts
webhooks: {
  populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  defaultHeaders: { Authorization: `Bearer ${env('WEBHOOK_SECRET')}` },
},
```
- Variables d'environnement nouvelles (nom, valeur de demo, commentaire francais pour .env.example) :
  - `MA_VARIABLE=valeur` : a quoi elle sert
- Dependances npm (package, version exacte, racine ou frontend) :
- Comment verifier apres application : <commande curl ou check demo:check>
````

## Emplacements deja prevus

- `apps/backend/config/server.ts` : commentaires `[config request MCP]` (`mcp.enabled`),
  `[config request CRONS]` (`cron.enabled`, `cron.tasks` depuis `apps/backend/config/cron-tasks.ts`),
  `[config request WEBHOOKS]` (`webhooks.defaultHeaders`).
- `apps/backend/config/admin.ts` : commentaire `[config request FRONT]` (`preview`).
