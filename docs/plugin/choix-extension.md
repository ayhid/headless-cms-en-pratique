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
