# Config request : CRONS

> **Monorepo Turborepo (23/09)** : Strapi vit désormais dans `apps/backend/` et le front dans `apps/frontend/`.
> Les chemins de ce document ont été réécrits en conséquence ; un `.env` sans préfixe désigne `apps/backend/.env`.
> Les commandes `npm run ...` se lancent depuis la racine du dépôt ; les extraits de `package.json` cités plus bas
> sont ceux de `apps/backend/package.json`. `scripts/demo-start.mts` n'existe plus : `npm run demo:start` passe par
> turbo. Détails : `docs/handoff/socle.md`, section « Monorepo Turborepo ».

## 1. apps/backend/config/server.ts

- Pourquoi : activer les crons et déclarer les deux tâches de `apps/backend/config/cron-tasks.ts`
  (publication programmée + récapitulatif des brouillons).
- Changement exact (à coller tel quel) :

En tête de fichier, sous l'import existant :

```ts
import cronTasks from './cron-tasks';
```

À la place du commentaire `// [config request CRONS] ...` :

```ts
  // Crons (apps/backend/config/cron-tasks.ts) : publication programmée + récapitulatif des brouillons
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
```

Fichier complet tel que testé (port 1340, avant restauration) :

```ts
import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    // [config request WEBHOOKS] defaultHeaders: { Authorization: `Bearer ${env('WEBHOOK_SECRET')}` },
  },
  // Crons (apps/backend/config/cron-tasks.ts) : publication programmée + récapitulatif des brouillons
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
  // [config request MCP] mcp: { enabled: true },
  mcp: {
    enabled: false,
  },
});

export default config;
```

- Variables d'environnement nouvelles : aucune. `DEMO_MODE=true` est déjà dans `.env.example`
  (commentaire existant correct). Rappel : `DEMO_MODE=true` = publication toutes les 30 s et
  récapitulatif toutes les minutes ; toute autre valeur = toutes les 5 min et tous les jours à 8 h (Europe/Paris).
- Dépendances npm : aucune (Strapi 5.54 embarque `croner`).
- Comment vérifier après application :
  `npm run demo:start`, attendre 30 s, puis `tail apps/backend/logs/crons.log` (ligne `[cron publication ...]`)
  et `npm run demo:check` (groupe CRONS, 3 contrôles verts).

## 2. .gitignore

- Pourquoi : `apps/backend/logs/crons.log` ne doit pas être versionné.
- Changement exact : **aucun**. Le `.gitignore` du SOCLE contient déjà `logs` (section Node.js)
  et `*.log` (section Logs and databases). Vérifié : `git check-ignore apps/backend/logs/crons.log` répond `apps/backend/logs/crons.log`.

## 3. .env.example

- Changement exact : **aucun**, `DEMO_MODE=true` y figure déjà.
