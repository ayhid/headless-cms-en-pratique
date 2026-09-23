# Config requests

Les fichiers de configuration partages appartiennent au SOCLE : `package.json` (racine et `frontend/`),
`.env` / `.env.example`, `config/server.ts`, `config/admin.ts`, `config/plugins.ts`,
`config/database.ts`, `config/middlewares.ts`, `src/index.ts`.

Un agent de phase 2 qui a besoin d'y toucher ne les modifie PAS dans son commit (sauf pour ses
tests locaux, a ne pas commiter). Il depose une demande dans ce dossier :
`docs/handoff/config-requests/<agent>.md` (ex. `mcp.md`, `webhooks.md`, `crons.md`, `front.md`).
Le SOCLE les applique toutes en une fois lors de la passe d'integration.

## Format

````markdown
# Config request : <AGENT>

## 1. <fichier cible, ex. config/server.ts>
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

- `config/server.ts` : commentaires `[config request MCP]` (`mcp.enabled`),
  `[config request CRONS]` (`cron.enabled`, `cron.tasks` depuis `config/cron-tasks.ts`),
  `[config request WEBHOOKS]` (`webhooks.defaultHeaders`).
- `config/admin.ts` : commentaire `[config request FRONT]` (`preview`).
