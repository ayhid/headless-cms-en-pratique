# Config request : PLUGIN

Quatre changements, testés ensemble depuis un worktree propre (procédure et sorties dans
`docs/handoff/plugin.md`). Aucune variable d’environnement nouvelle.

## 1. package.json (racine) : dépendance de build et scripts

- Pourquoi : un plugin créé avec le Plugin SDK est chargé depuis son `dist/` (champ `exports` de
  `src/plugins/editorial-toolkit/package.json`), et `strapi develop` ne le compile pas
  (`src/plugins/**` est exclu du `tsconfig.json` racine). Sans build, Strapi refuse de démarrer.
  Le SDK est installé à la racine : **ne jamais lancer `npm install` dans le dossier du plugin**
  (cela installerait un second `@strapi/strapi` et casserait l’admin, voir la doc
  « Plugin creation & setup », erreur `X must be used within StrapiApp`). Le build résout
  design-system, icons, react, etc. dans le `node_modules` racine.
- Dépendance npm (racine, devDependencies, version exacte) :
```json
"@strapi/sdk-plugin": "6.1.1",
```
- Scripts à ajouter (les `pre*` sont exécutés automatiquement par npm avant le script du même nom) :
```json
"plugin:build": "npm run build --prefix src/plugins/editorial-toolkit",
"plugin:watch": "npm run watch --prefix src/plugins/editorial-toolkit",
"postinstall": "npm run plugin:build",
"predemo:reset": "npm run plugin:build",
"predemo:start": "npm run plugin:build",
"predevelop": "npm run plugin:build",
"predev": "npm run plugin:build",
"prebuild": "npm run plugin:build",
```
  `predemo:reset` est indispensable : `strapi import` démarre Strapi, donc charge le plugin.
  Coût : environ 3 s par build (mesuré : 2,7 s).
- Commande d’installation : `npm install -D --save-exact @strapi/sdk-plugin@6.1.1`
  (met à jour `package-lock.json`, à commiter avec).

## 2. config/plugins.ts : activation du plugin local

- Pourquoi : un plugin local doit être déclaré avec `enabled: true` et `resolve`
  (sans `enabled`, ni le serveur ni l’admin ne le chargent, vérifié dans
  `@strapi/strapi/dist/src/node/core/plugins.js`).
- Changement exact, à ajouter dans l’objet renvoyé, après `upload` :
```ts
  // Plugin local "Boîte à outils éditoriale" (src/plugins/editorial-toolkit).
  // Il est chargé depuis son dossier dist/ : lancer `npm run plugin:build` après chaque modification.
  'editorial-toolkit': {
    enabled: true,
    resolve: './src/plugins/editorial-toolkit',
  },
```

## 3. src/api/article/content-types/article/schema.json : custom field « Ton éditorial »

- Pourquoi : montrer le custom field dans l’édition d’article et alimenter la check-list,
  le tableau de bord et le tool MCP. Le type stocké reste le type natif `string`.
- Ligne à ajouter dans `attributes`, juste après `excerpt` (l’ordre fixe la place dans le formulaire) :
```json
    "tone": { "type": "customField", "customField": "plugin::editorial-toolkit.tone", "pluginOptions": { "i18n": { "localized": true } } },
```
- Effets : `types/generated/contentTypes.d.ts` est régénéré par `strapi develop` (attribut `tone`
  en `Schema.Attribute.String & Schema.Attribute.CustomField<'plugin::editorial-toolkit.tone'>`),
  à commiter avec. Testé : `strapi import` de l’export actuel réussit malgré l’attribut ajouté
  (mode import, 2,4 s) ; regénérer quand même l’export (`npm run demo:reset && npm run demo:export`)
  pour qu’il contienne la colonne.
- Seed, facultatif (fichier SOCLE `scripts/seed/index.ts`, fonction `articleData`) : pour que la
  répartition des tons ne soit pas vide au démarrage, ajouter par exemple
  `tone: seed.state === 'published' ? ['factuel', 'pedagogique', 'enthousiaste', 'decale'][seed.author % 4] : null,`
  en laissant les brouillons sans ton (c’est ce que la démo remplit en direct).

## 4. config/server.ts : rien de plus que la config request MCP

- Le tool `editorial_checklist` s’enregistre tout seul dans `register()` ; il apparaît dès que
  `mcp: { enabled: true }` est appliqué (config request de l’agent MCP), pour tout jeton Admin
  ayant `plugin::content-manager.explorer.read` sur `api::article.article`.

## Comment vérifier après application

```bash
npm install                       # postinstall : build du plugin
npm run demo:reset                # predemo:reset : build du plugin, puis import
npm run demo:start
npm run demo:check                # section == PLUGIN : 6 contrôles
```

Sortie attendue (section PLUGIN, MCP activé) :

```
== PLUGIN
  [OK] Plugin editorial-toolkit compilé (dist/server et dist/admin présents)
  [OK] Plugin chargé : « Boîte à outils éditoriale » listé par GET /admin/plugins
  [OK] Custom field plugin::editorial-toolkit.tone enregistré (type natif string)
  [OK] Article utilise le custom field dans l’attribut « tone »
  [OK] Tableau de bord : 13 article(s) (fr 7, en 6), 2 brouillon(s) prêt(s) à publier, 1 à compléter
  [OK] MCP : tool editorial_checklist listé (4 tools pour un jeton lecture articles)
```

Note : `scripts/checks/plugin.ts` crée (et remplace à chaque passage) un jeton Admin nommé
« Contrôle demo:check (plugin éditorial) », lecture des articles uniquement, visible dans
Paramètres > Jetons Admin.
