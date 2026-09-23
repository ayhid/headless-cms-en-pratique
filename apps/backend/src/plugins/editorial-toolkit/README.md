# Boîte à outils éditoriale (`editorial-toolkit`)

Plugin local Strapi 5, créé avec le Plugin SDK (`npx @strapi/sdk-plugin init`).

- **Custom field « Ton éditorial »** (`plugin::editorial-toolkit.tone`) : sélecteur de pastilles
  (Factuel, Pédagogique, Enthousiaste, Décalé), stocké dans le type natif `string`.
- **Check-list de publication** : panneau latéral de l’édition d’article, ajouté avec l’API
  Content Manager `addEditViewSidePanel`, calculé en direct depuis le formulaire.
- **Tableau de bord éditorial** : entrée de menu « Boîte à outils éditoriale », alimentée par
  `GET /editorial-toolkit/dashboard` (Document Service, jamais de SQL).
- **Tool MCP `editorial_checklist`** : la check-list d’un article pour un agent IA
  (visible si `mcp.enabled` et si le jeton Admin peut lire les articles).

## Build

Strapi charge le plugin depuis `dist/` (champs `exports` du `package.json`) : le code source n’est
pas compilé par `strapi develop`.

```bash
npm run plugin:build   # depuis la racine du projet (strapi-plugin build, environ 3 s)
npm run plugin:watch   # recompile à chaque modification pendant le développement
```

Après une modification du code serveur, redémarrer Strapi. Les modifications admin sont reprises
par le serveur Vite de `strapi develop` après le rebuild.

Détails : `docs/plugin/choix-extension.md` et `docs/handoff/plugin.md`.
