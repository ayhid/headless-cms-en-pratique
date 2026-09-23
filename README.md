# strapi-prez-demo

Démo du talk « Headless CMS en pratique : Strapi au-delà du simple CMS ».
Monorepo npm workspaces + Turborepo :

| Dossier | Contenu |
|---|---|
| `apps/backend` | Strapi 5.54.0 (SQLite), plugin local `src/plugins/editorial-toolkit`, scripts de démo (`scripts/`) |
| `apps/frontend` | Next.js 16.3.6 (App Router), front de production |
| `docs/` | handoffs, MCP (`docs/mcp/mcp-curl.sh`), webhooks, plugin |
| `DEMO.md` | déroulé minuté de la démo, plans B |

## Démarrer (tout depuis la racine)

```bash
npm install            # un seul lockfile ; construit aussi le plugin
npm run demo:reset     # base de démo propre (environ 6 s)
npm run demo:start     # TUI Turborepo : Strapi http://localhost:1337/admin + front http://localhost:3000
npm run demo:check     # 30 s après le démarrage : 33/33 attendu
```

- `npm run dev` : Strapi `develop` + `next dev` (pas de cache côté front).
- `npm run demo:start -- --ui=stream` : mêmes serveurs, logs à la suite au lieu de la TUI.
- TUI : `↑` / `↓` pour passer des logs de Strapi à ceux du front, `u` / `d` pour défiler,
  `m` pour la liste des touches, `Ctrl+C` pour tout arrêter.

Fichiers `.env` non versionnés : `apps/backend/.env` et `apps/frontend/.env` (modèles `.env.example`).
Ne jamais lancer `npm install` dans un sous-dossier : l'admin Strapi (React 18) et le front (React 19)
partagent un seul lockfile, voir `docs/handoff/socle.md`, section « Monorepo Turborepo ».
