# Check-list de publication : API Content Manager plutôt qu’injection zone

## Le besoin

Afficher, dans l’écran d’édition d’un article, une check-list qui se met à jour pendant la saisie :
image de couverture, résumé de 50 à 200 caractères, SEO (titre et description), au moins un bloc,
date de parution, et en recommandé le ton éditorial (custom field du plugin).

## Ce que dit la documentation

Page « Content Manager APIs » (https://docs.strapi.io/cms/plugins-development/content-manager-apis) :

> « Use injection zones when you need to insert components into specific UI areas not covered by the Content Manager APIs. »

Le tableau de la même page associe explicitement « Add a custom panel in the Edit View side area »
à `addEditViewSidePanel`. Les API disponibles en 5.54.0 : `addEditViewSidePanel`,
`addDocumentAction`, `addDocumentHeaderAction`, `addBulkAction`, `addRichTextBlocks`.

## Décision

**`addEditViewSidePanel`**, appelée dans le `bootstrap(app)` admin du plugin
(`admin/src/index.ts`). Aucune injection zone.

| Option | Verdict |
|---|---|
| `addEditViewSidePanel` | Retenue : c’est exactement la zone visée (colonne de droite, sous « Entrée »), le panneau reçoit le contexte typé (`model`, `documentId`, `document`, `activeTab`), et il hérite du style natif des panneaux (titre en capitales, carte, espacements). |
| `addDocumentAction` / `addDocumentHeaderAction` | Écartées : ce sont des boutons ou des entrées de menu, pas un contenu visible en permanence. |
| `addBulkAction` | Hors sujet (vue liste). |
| Injection zone `editView.right-links` | Écartée : la doc la réserve aux zones non couvertes par les API ; ici la zone est couverte, et une injection zone n’a pas de titre de panneau ni de mise en forme native. |

## Détails d’implémentation

- Le composant du panneau (`admin/src/components/ChecklistPanel.tsx`) renvoie `null` pour les autres
  content-types : le Content Manager filtre les descriptions nulles, le panneau n’apparaît que sur Article.
- Le calcul se fait **en direct depuis les valeurs du formulaire** (`useForm` exporté par
  `@strapi/strapi/admin`) : cocher une date ou choisir un ton met à jour la check-list avant
  l’enregistrement. Le panneau est rendu à l’intérieur du `<Form>` de l’Edit View (vérifié dans
  `@strapi/content-manager/dist/admin/pages/EditView/EditViewPage.mjs`).
- Pour savoir quel attribut porte le custom field, le panneau lit le schéma via
  `unstable_useContentManagerContext` (exporté par `@strapi/strapi/admin`). Le préfixe `unstable_`
  signifie que la signature peut changer dans une version mineure : c’est le seul point fragile,
  isolé dans une ligne.
- Les règles sont des fonctions pures dans `shared/checklist.ts`, partagées avec le serveur
  (tableau de bord, tool MCP) : l’écran, l’API et l’agent IA donnent toujours le même verdict.
- La barre de progression est faite avec des `Box` du design system plutôt qu’avec `ProgressBar`,
  prévu pour des fonds colorés (upload) et peu lisible dans un panneau, surtout en thème sombre.

## Mode révélateur : les injection zones, pour un emplacement précis

Le plugin a un second mécanisme d’extension, réservé à la pédagogie du talk : le **mode révélateur**
rend visibles les injection zones du Content Manager. Code : `admin/src/components/InjectionZoneReveal.tsx`
(commentaire d’en-tête), appelé dans le `bootstrap(app)` admin juste après `addEditViewSidePanel`.

Page « Admin injection zones » (https://docs.strapi.io/cms/plugins-development/admin-injection-zones),
encadré tl;dr :

> « For adding panels, actions, or buttons to the Content Manager, the Content Manager APIs […] are often more robust and better typed than injection zones. Use injection zones when you need to insert components into specific UI areas not covered by the Content Manager APIs. »

| Besoin | Outil | Pourquoi |
|---|---|---|
| Check-list dans la colonne de droite de l’édition | `addEditViewSidePanel` (Content Manager API) | Zone couverte par l’API, props typées, style natif du panneau. |
| Étiquette à côté des filtres de la liste, dans les fenêtres de confirmation, sous les boutons de publication, dans l’en-tête de l’aperçu | `getPlugin('content-manager').injectComponent(view, zone, { name, Component })` | Emplacements précis qu’aucune API du Content Manager ne vise. |

Zones injectées, et ce qu’en fait le Content Manager 5.54.0 (vérifié dans
`node_modules/@strapi/content-manager/dist/admin/components/InjectionZone.mjs` et ses appelants) :

| Zone | Rendue par | Props reçues |
|---|---|---|
| `listView.actions` | `pages/ListView/ListViewPage.mjs` (entre filtres et engrenage) | aucune |
| `editView.right-links` | `pages/EditView/components/Panels.mjs` (panneau « Entrée », sous les boutons) | `slug` (uid du content-type) |
| `preview.actions` | `preview/components/PreviewHeader.mjs` | aucune |
| `listView.publishModalAdditionalInfos` | déclarée, **rendue nulle part** en 5.54.0 | sans objet |
| `listView.unpublishModalAdditionalInfos` | déclarée, **rendue nulle part** en 5.54.0 | sans objet |
| `listView.deleteModalAdditionalInfos` | déclarée, **rendue nulle part** en 5.54.0 | sans objet |

Les trois zones de fenêtre de confirmation sont déclarées dans `INJECTION_ZONES` et le plugin i18n y
injecte aussi ses composants, mais aucun écran de 5.54.0 ne les affiche (et la liste n’a plus de bouton
« Publier » par ligne). Le plugin y injecte quand même : l’étiquette apparaîtra dès qu’une version les
rendra. C’est un bon argument pour la règle de la doc : une injection zone n’a pas de contrat typé.

**Pas `editView.informations`** : la doc la dit interne (« For third-party plugins, `editView.right-links`
is the most stable and officially recommended Edit view extension point »). Commentaire dans le code.

Fonctionnement : chaque composant injecté rend `null` tant que le mode est inactif (aucun impact visuel).
Actif, il affiche une étiquette en pointillés (Box/Flex/Badge/Typography, jetons de couleur `primary*` et
`neutral*` du thème, donc lisible en clair et en sombre) : badge « Injection zone » et nom technique en
police mono, plus les noms des props reçues. L’interrupteur est sur le tableau de bord du plugin
(`Toggle` du design system). État dans `localStorage` sous la clé `editorial-toolkit:reveal-injection-zones`
(lecture et écriture dans un `try/catch`, désactivé par défaut), synchronisé en direct : événement
`storage` pour les autres onglets, événement personnalisé pour l’onglet courant. Aucun rechargement,
aucun redémarrage de Strapi.
