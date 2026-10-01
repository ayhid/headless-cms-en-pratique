# Headless CMS en pratique

Demo project for the talk **« Headless CMS en pratique »**, given by [Ayoub Hidri](https://ayoub-hidri.dev/)
at the Strapi Meetup Strasbourg (SSW Strasbourg, 23 September 2026).

It shows how to go from a content model to a production Next.js front end, then hand the writing to an
AI agent through **Strapi's built-in MCP server**, without giving it more rights than its token allows.

> **The agent proposes, the editor publishes.** With a read-only token, the publish tool does not
> even appear in the agent's tool list.

*Le talk, le code et la documentation sont en français.*

## What's inside

| | |
|---|---|
| **Strapi 5** | Content types, components and dynamic zones, draft & publish, i18n (fr / en), REST, GraphQL and the Document Service |
| **Next.js App Router** | Production front end, `revalidateTag` driven by a Strapi webhook, draft preview |
| **Built-in MCP server** | Two Admin tokens (full and read-only), a tested Claude Code scenario, raw JSON-RPC calls with curl |
| **Local plugin** `editorial-toolkit` | Custom field, publication checklist, editorial dashboard, injection zones, its own MCP tool |
| **Demo tooling** | Reset to a clean database in ~6 s, a 33-point health check, a timed run sheet with fallback plans |

## Talk outline

1. Pourquoi le headless : le monolithe, le découplage, les limites
2. Les concepts clés : modélisation, schéma, une requête en REST / GraphQL / Document Service, draft & publish, i18n, permissions
3. Architecture & écosystème : cycle d'une requête, plugins, injection zones, déploiement
4. Le serveur MCP intégré : principe, tools, garde-fous
5. Démo live : modéliser, publier, afficher, déléguer à un agent
6. Quand choisir Strapi, et quand regarder ailleurs

## Connect Claude Code to Strapi's MCP server

With the demo running (see below) and the tokens from `apps/backend/.env` exported:

```bash
set -a; . apps/backend/.env; set +a
claude --mcp-config .mcp.json.example --strict-mcp-config
```

Then ask the agent to list what it can manage, create a French draft and update it. Try again with the
read-only token (`STRAPI_MCP_ADMIN_TOKEN=$STRAPI_MCP_READONLY_TOKEN claude ...`) and ask it to publish:
it can't, because the tool is filtered out of `tools/list`. The full scenario, with the agent's real
output, is in [`docs/mcp/scenario.md`](docs/mcp/scenario.md).

## Structure

Monorepo npm workspaces + Turborepo :

| Dossier | Contenu |
|---|---|
| `apps/backend` | Strapi 5.54.0 (SQLite), plugin local `src/plugins/editorial-toolkit`, scripts de démo (`scripts/`) |
| `apps/frontend` | Next.js 16.3.6 (App Router), front de production |
| `docs/` | handoffs, MCP (`docs/mcp/mcp-curl.sh`), webhooks, plugin |
| `DEMO.md` | déroulé minuté de la démo, plans B |

## Démarrer (tout depuis la racine)

```bash
cp apps/backend/.env.example apps/backend/.env    # modèles d'environnement
cp apps/frontend/.env.example apps/frontend/.env
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

## Licence

[MIT](LICENSE) © 2026 Ayoub Hidri
