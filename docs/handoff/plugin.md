# Handoff PLUGIN : « Boîte à outils éditoriale » (`editorial-toolkit`)

Plugin local Strapi 5.54.0 dans `src/plugins/editorial-toolkit`, créé avec le Plugin SDK
(`npx @strapi/sdk-plugin@6.1.1 init`, TypeScript, admin + serveur), puis complété à la main.
Aucun fichier du SOCLE n’est modifié par ce commit : tout ce qui touche `package.json`,
`config/plugins.ts` et le schéma d’article est dans `docs/handoff/config-requests/plugin.md`.

## Ce que fait le plugin (tout vérifié en vrai, sorties plus bas)

1. **Custom field « Ton éditorial »** `plugin::editorial-toolkit.tone` : une rangée de pastilles
   (Factuel, Pédagogique, Enthousiaste, Décalé) avec icône et libellé, navigation au clavier,
   bouton « Effacer le ton » et une phrase d’aide par ton. Stocké dans le type natif `string`
   (le Content-Type Builder renvoie d’ailleurs `"type":"string"` pour l’attribut). Visible dans le
   Content-Type Builder, onglet **Personnalisé**, avec une icône au format des icônes natives.
2. **Check-list de publication** : panneau dans la colonne de droite de l’édition d’article, sous
   « Entrée » et « Preview », ajouté avec l’API Content Manager `addEditViewSidePanel`
   (choix justifié dans `docs/plugin/choix-extension.md`). Calculée **en direct depuis le
   formulaire**, avant enregistrement : couverture, résumé de 50 à 200 caractères, SEO (titre et
   description), au moins un bloc, date de parution (`publishAt`), et en recommandé le ton.
   Barre de progression, badge « Prêt à publier » ou « À compléter ». N’apparaît que sur Article.
3. **Tableau de bord éditorial** : entrée de menu (icône plume, libellé « Boîte à outils
   éditoriale »), page 100 % design system : 4 compteurs, tableau par locale (Français par défaut,
   Anglais), brouillons prêts à publier, brouillons à compléter avec les critères manquants en
   badges, répartition des tons, bouton « Ouvrir » vers l’article, bouton « Actualiser ».
   Alimenté par `GET /editorial-toolkit/dashboard` (route admin, JWT admin + permission de lecture
   des articles), service basé sur le Document Service, jamais de SQL. Le statut « Modifié » suit
   la même règle que le Content Manager (brouillon plus récent que la version publiée).
4. **Tool MCP `editorial_checklist`** (bonus retenu) : renvoie la check-list d’un `documentId`
   (texte lisible + `structuredContent`). Listé uniquement pour un jeton Admin qui peut lire les
   articles : vérifié, un jeton limité aux auteurs ne le voit pas.
5. Routes admin supplémentaires : `GET /editorial-toolkit/checklist/:documentId?locale=fr`
   et `GET /editorial-toolkit/info` (utilisée par `demo:check`).

Les règles de la check-list sont écrites une seule fois (`shared/checklist.ts`) et utilisées par
le panneau, le tableau de bord et le tool MCP : l’écran, l’API et l’agent donnent le même verdict.

## Mode révélateur des injection zones

Ajouté après coup pour le talk. Interrupteur **Afficher les injection zones** en haut du tableau de bord
du plugin ; actif, il affiche une étiquette en pointillés « INJECTION ZONE » + nom technique (police mono)
à chaque injection zone du Content Manager. Inactif (défaut) : les composants injectés rendent `null`.

- Code : `admin/src/components/InjectionZoneReveal.tsx` (zones, étiquette, commentaire d’en-tête :
  Content Manager APIs pour la check-list, injection zones pour viser un emplacement précis),
  `admin/src/utils/revealMode.ts` (état), `admin/src/pages/DashboardPage.tsx` (interrupteur).
- Zones injectées dans `bootstrap(app)` : `listView.actions`, `listView.publishModalAdditionalInfos`,
  `listView.unpublishModalAdditionalInfos`, `listView.deleteModalAdditionalInfos`,
  `editView.right-links`, `preview.actions`. Pas `editView.informations` (interne selon la doc).
- **Limite constatée en 5.54.0** : seules `listView.actions` (aucune prop), `editView.right-links`
  (prop `slug`) et `preview.actions` (aucune prop) sont rendues. Les trois zones de fenêtre de confirmation
  sont déclarées mais aucun écran ne les affiche : l’étiquette n’y apparaît pas. Détail et sources dans
  `docs/plugin/choix-extension.md`, section « Mode révélateur ».
- État : `localStorage["editorial-toolkit:reveal-injection-zones"]`, lu dans un `try/catch`, synchronisé
  entre onglets (`storage`) et dans l’onglet (événement personnalisé). `demo:reset` ne le remet pas à zéro
  (il vit dans le navigateur) : le désactiver à la main avant la démo (checklist de `DEMO.md`).
- Contrôle `demo:check` (section PLUGIN) : les 6 noms de zones sont dans `dist/admin`, avec
  `injectComponent(`, et `editView.informations` n’y est pas ; ligne d’information sur les zones que le
  Content Manager installé affiche réellement.
- Vérifié sans navigateur : rendu serveur des composants (React + design system) avec un `localStorage`
  simulé : rien quand le mode est inactif, étiquette `editView.right-links` avec `props : slug` quand il est
  actif, clé supprimée à la désactivation. **Rendu visuel à vérifier à l’œil** (liste dans `DEMO.md`,
  étape 6) : pas de connexion à l’admin dans un navigateur automatisé pour ce lot.

## Bonus MCP : pourquoi il est retenu

La page https://docs.strapi.io/cms/plugins-development/extend-mcp-server ne porte aucune mention
experimental, beta ou unstable (vérifié sur la version markdown et sur la page HTML : aucune
occurrence de « beta », « experimental », « unstable »). Elle indique :
« Registrations must happen while the MCP server is idle, before it starts. »
L’API `strapi.ai.mcp.registerTool` existe dans `@strapi/core` 5.54.0
(`dist/services/mcp/index.js`) et le test réel passe (sortie plus bas). Réserve honnête : la note
de version 5.47.0 présentait le serveur MCP comme BETA (voir le plan) ; la doc actuelle ne le dit
plus, mais c’est une fonctionnalité récente.

## Démo en 60 secondes (clics exacts)

Prérequis : config request appliquée, `npm run demo:reset`, `npm run demo:start`, connecté à
http://localhost:1337/admin avec l’admin de démo.

1. Barre latérale gauche : cliquer l’icône **plume** (infobulle « Boîte à outils éditoriale »).
   Montrer les compteurs, le tableau « Par locale », puis « Brouillons prêts à publier »
   (« Publication programmee par un cron », fr et en, 5 / 6) et « Brouillons à compléter »
   (« Brouillon : ecrire son propre plugin », badge rouge « DATE DE PARUTION »).
2. Sur la ligne « Brouillon : ecrire son propre plugin », cliquer **Ouvrir**.
3. Colonne de droite : montrer le panneau **CHECK-LIST DE PUBLICATION** (4 sur 6 critères,
   « À COMPLÉTER », croix rouge sur « Date de parution »).
4. Descendre en bas du formulaire : champ **publishAt**, cliquer dans la date, choisir un jour.
   Le panneau passe à 5 sur 6 et au badge vert « PRÊT À PUBLIER », sans enregistrer.
5. Champ **tone** juste sous « excerpt » : cliquer la pastille **Pédagogique**. La phrase d’aide
   s’affiche, le panneau passe à 6 sur 6.
6. (facultatif) Cliquer **Enregistrer**, revenir sur la plume, cliquer **Actualiser** : l’article
   est passé dans « Brouillons prêts à publier ».
7. (facultatif, 15 s) Content-Type Builder > Article > **Ajouter un autre champ** > onglet
   **Personnalisé** : la carte « Ton éditorial » est là. Phrase clé : « un custom field ne crée pas
   de type, il habille un type natif : ici une simple chaîne ».
8. (facultatif, MCP) Dans Claude Code : « Donne-moi la check-list éditoriale de l’article
   brouillon-plugin-maison » : l’agent doit trouver le documentId (`list_article`) puis appeler
   `editorial_checklist`. Testé en JSON-RPC direct (sortie plus bas), pas encore joué avec Claude Code.

## Build et chargement : procédure exacte pour le SOCLE

- Un plugin SDK est chargé depuis `dist/` : `package.json#exports["./strapi-server"]` pour le
  serveur, `exports["./strapi-admin"].import` (= `dist/admin/index.mjs`) pour l’admin (vérifié dans
  `@strapi/strapi/dist/src/node/core/plugins.js`, et `.strapi/client/app.js` importe bien
  `src/plugins/editorial-toolkit/./dist/admin/index.mjs`). `strapi develop` ne compile pas
  `src/plugins/**` (exclu du `tsconfig.json` racine).
- `@strapi/sdk-plugin` 6.1.1 est installé **à la racine** (devDependency) ; le plugin n’a pas de
  `node_modules` propre et ne doit pas en avoir (doublon de `@strapi/strapi`, erreur
  `X must be used within StrapiApp` citée par la doc). `npm run build --prefix
  src/plugins/editorial-toolkit` trouve `strapi-plugin` et les dépendances dans le
  `node_modules` racine.
- Les scripts `postinstall`, `predemo:reset`, `predemo:start`, `predevelop`, `predev`, `prebuild`
  lancent `npm run plugin:build` (environ 3 s) : aucune étape manuelle à oublier.
- Pendant le développement du plugin : `npm run plugin:watch` dans un terminal. Une modification
  **admin** est reprise par le Vite de `strapi develop` (vérifié : la page se met à jour après
  rebuild). Une modification **serveur** exige de redémarrer Strapi (le watcher de `develop`
  ne redémarre pas sur `dist/` du plugin, vérifié).

Test depuis un worktree propre (commit PLUGIN + config request appliquée à la lettre) :

```
$ npm install                    # postinstall -> [INFO] Build complete!  (added 1544 packages in 18s)
$ time PORT=1342 npm run demo:reset
[INFO] Build complete!
[reset] Base et uploads supprimes (0.0 s)
[reset] Restauration de data/demo-export.tar via strapi import...
[reset] Termine en 2.2 s (mode : import). Lancer ensuite : npm run demo:start
... 4.813 total
$ npm run build                  # prebuild + strapi build (admin de production)
[INFO] Build complete!
✔ Compiling TS (988ms)
✔ Building build context (65ms)
✔ Building admin panel (7527ms)
$ PORT=1342 FRONT_PORT=3005 npm run demo:start   # [INFO] Build complete! ... Strapi started successfully
$ PORT=1342 FRONT_PORT=3005 npm run demo:check   # Tout est vert : 14/14 OK
```

Contre-épreuve sans build (`dist/` supprimé, `tsx scripts/demo-reset.ts` lancé sans le hook) :
`Error: Could not find Custom Field: plugin::editorial-toolkit.tone`, l’import et le seed échouent.

## Sorties réelles des vérifications

`GET /admin` : HTTP 200. `GET /editorial-toolkit/dashboard` sans JWT : HTTP 401.

`GET /admin/plugins` (JWT admin) :
```
{"name":"editorial-toolkit","displayName":"Boîte à outils éditoriale","description":"Ton éditorial, check-list de publication et tableau de bord éditorial."}
```

`GET /editorial-toolkit/info` :
```
{"data":{"plugin":"editorial-toolkit","customField":{"uid":"plugin::editorial-toolkit.tone","type":"string"},"toneFieldOnArticle":"tone"}}
```

`GET /content-type-builder/content-types/api::article.article` (extrait) :
```
"tone":{"type":"string","customField":"plugin::editorial-toolkit.tone","pluginOptions":{"i18n":{"localized":true}}
```

`GET /editorial-toolkit/dashboard` (résumé) :
```
totals {"total":13,"published":10,"draft":3,"modified":0}
perLocale fr "Français" (par défaut) 7 | en "Anglais" 6
readyToPublish fr/en "Publication programmee par un cron" 5/6 (manque : tone, recommandé)
toComplete fr "Brouillon : ecrire son propre plugin" 4/6 (manque : publishAt, tone)
```

MCP (serveur activé localement, jeton Admin créé par `POST /admin/admin-tokens`, lecture articles) :
```
POST /admin/admin-tokens -> 201
initialize -> 200 { name: 'strapi-mcp-server', version: '1.0.0' }
tools/list -> 200 log, editorial_checklist, list_article, get_article
tools/call editorial_checklist -> 200
Publication programmee par un cron : 5/6 critères remplis, prêt à publier.
[OK] Image de couverture : Présente
[OK] Résumé de 50 à 200 caractères : 75 caractères
[OK] SEO : titre et description : Titre et description renseignés
[OK] Au moins un bloc de contenu : 2 blocs
[OK] Date de parution : 23 septembre 2026 à 09:42
[  ] Ton éditorial choisi (recommandé) : Aucun ton choisi
structuredContent.ready = true
```
Avec un jeton limité aux auteurs : `tools/list -> log, list_author, get_author` (tool masqué).
`log` est l’outil natif réservé au mode développement.

`demo:check`, section PLUGIN (MCP activé, puis désactivé) :
```
== PLUGIN
  [OK] Plugin editorial-toolkit compilé (dist/server et dist/admin présents)
  [OK] Plugin chargé : « Boîte à outils éditoriale » listé par GET /admin/plugins
  [OK] Custom field plugin::editorial-toolkit.tone enregistré (type natif string)
  [OK] Article utilise le custom field dans l’attribut « tone »
  [OK] Tableau de bord : 13 article(s) (fr 7, en 6), 2 brouillon(s) prêt(s) à publier, 1 à compléter
  [OK] MCP : tool editorial_checklist listé (4 tools pour un jeton lecture articles)
  ...
  [OK] Serveur MCP désactivé (HTTP 405) : tool editorial_checklist non contrôlé
```

Vérifications TypeScript : `tsc -p admin/tsconfig.json` et `tsc -p server/tsconfig.json` : 0 erreur.

## Vérifié visuellement (Chrome, sans saisir de mot de passe)

Connexion en posant le JWT obtenu par `POST /admin/login` dans le `localStorage` (`jwtToken`),
comme le fait l’admin lui-même. Constaté à l’écran, thème sombre :
tableau de bord complet ; panneau de check-list dans l’édition d’article ; pastilles du ton
(sélection, aide, effacement) ; passage à « PRÊT À PUBLIER » en choisissant une date dans le
sélecteur natif, sans enregistrer ; carte « Ton éditorial » dans l’onglet Personnalisé du
Content-Type Builder ; icône du champ dans la liste des champs, au même format que les icônes natives.

**Reste à vérifier à l’œil par l’humain** : le thème clair (couleurs des pastilles et de la barre
de progression) ; le rendu à la résolution du vidéoprojecteur (testé seulement à 1568 px de large :
si la fenêtre est étroite, le Content Manager replie la colonne de droite, comportement natif) ; l’enregistrement
puis la publication d’un article avec un ton choisi (testé côté API, pas cliqué jusqu’au bout
pour garder la base propre).

## Ce qui casse si on touche à quoi

- **Build du plugin** : sans `dist/`, Strapi ne trouve pas le custom field et tout schéma qui
  l’utilise fait échouer le démarrage, l’import et le seed (`Could not find Custom Field`).
  Garder les hooks `pre*`/`postinstall` ; après un `git clean` ou un clone, `npm install` suffit.
- **Code serveur du plugin modifié** : `npm run plugin:build` puis redémarrer Strapi.
- **Nom stocké dans les schémas** : `plugin::editorial-toolkit.tone` = `plugin::<nom du plugin>.<nom
  du champ>`. Renommer le plugin (clé dans `config/plugins.ts`, `strapi.name`, `PLUGIN_ID`) ou le
  champ (`TONE_FIELD_NAME` dans `shared/constants.ts`) casse tous les schémas qui l’utilisent.
  `plugin` (serveur) et `pluginId` (admin) doivent rester identiques.
- **Valeurs du ton** (`factuel`, `pedagogique`, `enthousiaste`, `decale`) : ce sont les chaînes
  stockées en base. En changer une rend les anciennes valeurs orphelines (affichées « Non
  renseigné »). Les libellés, eux, peuvent changer librement (traductions).
- **Désactiver le plugin** (`enabled: false` ou retrait de `config/plugins.ts`) alors qu’Article
  garde l’attribut `tone` : le custom field n’est plus enregistré, même erreur que la
  contre-épreuve sans build (`Could not find Custom Field`). Retirer d’abord l’attribut du schéma.
- **Schéma d’article** : le panneau et le tableau de bord lisent `cover`, `excerpt`, `seo.metaTitle`,
  `seo.metaDescription`, `blocks`, `publishAt`. Renommer l’un d’eux fait échouer le critère
  correspondant (sans plantage). L’attribut du ton est détecté automatiquement, quel que soit son nom.
- **`npm install` dans `src/plugins/editorial-toolkit`** : à ne jamais faire (second
  `@strapi/strapi`, admin cassé). Si c’est fait : supprimer ce `node_modules`.
- **Montée de version Strapi** : `unstable_useContentManagerContext` (lecture du schéma dans le
  panneau) peut changer de signature ; c’est le seul import « unstable » du plugin.
- **Jeton de contrôle** : `scripts/checks/plugin.ts` supprime et recrée à chaque passage le jeton
  Admin « Contrôle demo:check (plugin éditorial) » (lecture des articles) quand le MCP est actif.

## Écarts par rapport à la demande

- Aucun seed propre au plugin (hors de mon périmètre de fichiers) : tous les tons sont « Non
  renseigné » au départ, ce qui sert la démo. Snippet facultatif dans la config request.
- Le panneau utilise `useForm` (valeurs en direct) plutôt que la prop `document` fournie par
  l’API, qui ne reflète que la version enregistrée.
- Les messages du tool MCP sont en français (affichés à l’humain via l’agent) ; la description du
  tool et de ses paramètres est en anglais (lue par le modèle, comme les tools natifs).
