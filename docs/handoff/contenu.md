# Handoff CONTENU (phase 2)

> **Monorepo Turborepo (23/09)** : Strapi vit désormais dans `apps/backend/` et le front dans `apps/frontend/`.
> Les chemins de ce document ont été réécrits en conséquence ; un `.env` sans préfixe désigne `apps/backend/.env`.
> Les commandes `npm run ...` se lancent depuis la racine du dépôt ; les extraits de `package.json` cités plus bas
> sont ceux de `apps/backend/package.json`. `scripts/demo-start.mts` n'existe plus : `npm run demo:start` passe par
> turbo. Détails : `docs/handoff/socle.md`, section « Monorepo Turborepo ».

## Populate exact (à appliquer tel quel par FRONT et l'intégration)

Le populate du contrat **suffit**, galerie comprise (vérifié en réel sur Strapi 5.54.0) :

```
populate[blocks][populate]=*&populate[cover]=true&populate[author]=true&populate[category]=true&populate[seo][populate]=*
```

`populate[blocks][populate]=*` applique `*` à chaque component de la zone dynamique : les médias de premier
niveau (`images` de `blocks.gallery`) sont bien renvoyés, avec `url`, `alternativeText`, `width`, `height` et `formats`.
Le JSON du texte riche (`body`) est un champ scalaire, il est toujours renvoyé.
Si un jour un component de la zone contient une relation ou un component imbriqué à 2 niveaux, il faudra
passer à la syntaxe `populate[blocks][on][blocks.xxx][populate][...]` (fragments `on`, voir la doc
populate du Document Service).

**URLs des médias** : relatives (`/uploads/...`, provider local). Le front les préfixe avec
`NEXT_PUBLIC_STRAPI_URL`, sinon `STRAPI_URL` (server components), sinon `http://localhost:1337`
(`apps/frontend/components/blocks/media.ts`, fonction `strapiMediaUrl`, exportée aussi par `@/components/blocks`
pour la cover). Les URLs absolues (provider cloud) sont laissées telles quelles.
Les images sont rendues avec `<img>` et non `next/image` : pas de dépendance à `images.remotePatterns`
(limité au port 1337 dans `next.config.ts`).

## Ce qui marche (vérifié)

- **Components** (`apps/backend/src/components`), noms affichés en français dans l'admin, icônes valides du sélecteur
  d'icônes du Content-type Builder (une icône inconnue retombe sur « dashboard ») :

| uid | displayName | icône | champs |
|---|---|---|---|
| `blocks.rich-text` | Texte riche | `write` | `body` (blocks, requis) |
| `blocks.quote` | Citation | `quote` | `text` (text, requis, 500 max), `author` (string, requis), `role` (string, optionnel) |
| `blocks.gallery` | Galerie | `picture` | `images` (media multiple, images, requis), `caption` (string, optionnel) |
| `shared.seo` | SEO | `search` | `metaTitle` (70 max), `metaDescription` (160 max), `shareImage` (media) |

  `shared.seo` est bien réutilisé par `article` ET `category` (schémas du SOCLE, rien à changer).
  Aucun nom de champ n'est partagé avec un type différent entre les components de la zone
  (contrainte des zones dynamiques).
- **Seed** `apps/backend/scripts/seed/contenu.ts` : article `composer-un-article-bloc-par-bloc` (fr) /
  `composing-an-article-block-by-block` (en), publié dans les deux locales via le Document Service :
  texte riche (titre, paragraphes, code en ligne, gras, liste, lien) + citation (Léa Fontaine, personne fictive)
  + galerie de 3 images (uploads dédiés `galerie-1..3.png` avec texte alternatif) + SEO avec image de partage.
  Auteur Ines Carvalho, catégorie Editorial. Idempotent (ne fait rien si le slug existe).
  Vérifié : `demo:reset` **sans** `apps/backend/data/demo-export.tar` bascule sur le seed et crée l'article (4,3 s) :
  `Seed agent : contenu` puis `article composé publié en fr et en`, `6 article(s) publies en fr, 6 en en`.
- **Front** `apps/frontend/components/blocks/` (server components, Tailwind) : `index.tsx` (`Blocks({ blocks })`,
  dispatch sur `__component`), `rich-text.tsx` (rendu maison du format blocks : paragraph, heading 1 à 6,
  list ordonnée ou non, list-item, link, quote, code, image, marques bold/italic/underline/strikethrough/code),
  `quote.tsx`, `gallery.tsx` (grille 1 à 3 colonnes, rendition `medium` si elle existe), `media.ts`, `types.ts`.
  Bloc inconnu : petit encart pointillé « Bloc non pris en charge par le front » en dev, rien en production.
  Tableau vide ou `null` : rien n'est rendu. `tsc` et `eslint` passent.
- **Rendu réel** (page temporaire non commitée, même populate) : HTML contenant les 3 blocs, la citation et
  les 3 `<img src="http://localhost:1341/uploads/medium_galerie_*.png">` (HTTP 200 sur l'image), en fr et en.
- **Ajout d'une citation par l'API admin du Content Manager** (JWT via `POST /admin/login`, puis
  `PUT /content-manager/collection-types/api::article.article/:documentId?locale=fr` et
  `POST .../:documentId/actions/publish?locale=fr`) sur `pourquoi-un-cms-headless` : la 2e citation apparaît
  dans la réponse de l'API publique et dans le HTML rendu.
  Piège : renvoyer le document tel que le GET l'a renvoyé échoue en 400 `Invalid status` dès qu'il a été
  modifié (`status: "modified"`) ; retirer le champ `status` du corps du PUT et du publish.
- **Check** `apps/backend/scripts/checks/contenu.ts` : 3 lignes, vertes avec la base issue du seed (11/11 au total).

## Forme des données par bloc (réponse réelle, tronquée)

```json
{ "id": 25, "__component": "blocks.rich-text",
  "body": [ { "type": "heading", "level": 2, "children": [ { "type": "text", "text": "Une page, plusieurs blocs" } ] },
            { "type": "paragraph", "children": [ { "type": "text", "text": "Avec une zone dynamique, ..." },
                                                { "type": "text", "text": "__component", "code": true } ] },
            { "type": "list", "format": "unordered", "children": [ { "type": "list-item", "children": [ ... ] } ] },
            { "type": "paragraph", "children": [ { "type": "link", "url": "https://docs.strapi.io/...", "children": [ ... ] } ] } ] }

{ "id": 25, "__component": "blocks.quote",
  "text": "Le bon modèle de contenu, c'est celui que la rédaction comprend sans lire la documentation.",
  "author": "Léa Fontaine", "role": "Directrice éditoriale chez Studio Méridien (société fictive)" }

{ "id": 2, "__component": "blocks.gallery", "caption": "Trois visuels générés pour la démo, affichés en grille.",
  "images": [ { "id": 11, "documentId": "ckuvci0s5bwvqrgcxgi07x6o", "name": "galerie-1.png",
                "alternativeText": "Visuel de démo numéro 1", "width": 1200, "height": 630,
                "url": "/uploads/galerie_1_3cada564b6.png",
                "formats": { "medium": { "url": "/uploads/medium_galerie_1_3cada564b6.png", "width": 750 } } } ] }
```

`seo` : `{ "metaTitle": "...", "metaDescription": "...", "shareImage": { "url": "/uploads/cover_4_....png", ... } }`.

## Démo en 60 secondes : ajouter une citation dans l'écran de composition

Prérequis : Strapi et le front lancés, admin connecté (libellés de l'admin en français, relevés dans les
traductions de Strapi 5.54.0 ; parcours à répéter une fois à blanc dans Chrome, voir « Écarts »).

1. Menu de gauche : **Gestion du contenu**, puis **Article** dans la liste des types de collection.
2. Ouvrir « Composer un article bloc par bloc » (locale fr).
3. Descendre jusqu'à la zone dynamique `blocks` : on voit les 3 blocs Texte riche, Citation, Galerie.
   (Les flèches « Déplacer le composant vers le haut / bas » permettent de réordonner : effet garanti.)
4. Cliquer **Ajouter un composant à blocks**, puis dans « Choisir un composant », catégorie **blocks**,
   cliquer **Citation**.
5. Remplir `text` (par ex. « Publier, c'est déjà relire. »), `author` (« Hugo Lambert »),
   `role` (« Rédacteur invité »).
6. Cliquer **Enregistrer** (ou Cmd + Entrée), puis **Publier** (ou Cmd + Maj + Entrée).
7. Recharger la page de l'article côté front : la nouvelle citation apparaît sous forme d'encart indigo.
   (La revalidation automatique par webhook sera vérifiée à l'intégration ; sans elle, recharger suffit
   tant que le front ne met pas la page en cache.)

Plan B si le clic rate en direct : `curl` sur l'API avec le populate ci-dessus et montrer le bloc
`blocks.quote` ajouté dans le JSON.

## Ce qui casse si on touche à quoi

- **Renommer un component** (fichier `apps/backend/src/components/blocks/quote.json` → autre nom, ou changer sa catégorie) :
  l'uid `blocks.quote` change, donc la zone dynamique de `article` (schéma du SOCLE) référence un component
  absent, le seed du SOCLE et `apps/backend/scripts/seed/contenu.ts` échouent, l'import de `apps/backend/data/demo-export.tar` échoue,
  et le front affiche l'encart « Bloc non pris en charge ». Changer le **displayName** ou l'**icône** est sans risque.
- **Renommer un champ** (`text`, `author`, `role`, `images`, `caption`, `body`, `metaTitle`...) : casse les deux seeds,
  l'export et les composants du front (`apps/frontend/components/blocks/types.ts`). Supprimer un champ efface ses données.
- **Rendre `role` ou `caption` requis** : le seed du SOCLE crée des citations sans `role`, il échouerait.
- **Ajouter un champ de même nom mais de type différent** dans deux components de la zone : interdit par Strapi.
- **Ajouter un component à la zone dynamique** : le front affiche l'encart de repli (dev) ou rien (prod)
  tant qu'un composant React n'est pas ajouté dans `index.tsx`. S'il contient une relation ou un component
  imbriqué, le populate `*` ne suffit plus (fragments `on`).
- **Modifier un schéma de component** : l'ancien export s'importe parfois quand même (champs optionnels ajoutés) ;
  dans tous les cas, régénérer l'export (voir `docs/handoff/config-requests/contenu.md`).
- **Changer de provider d'upload** (S3...) : les URLs deviennent absolues, `strapiMediaUrl` les laisse telles quelles.

## Écarts et limites

- Le parcours de clics ci-dessus n'a pas été exécuté dans Chrome : se connecter à l'admin demande de saisir
  un mot de passe, ce que je ne fais pas. L'opération équivalente a été faite par l'API admin du Content Manager
  (mêmes routes que l'interface) et les libellés viennent des fichiers de traduction fr de Strapi 5.54.0.
- L'export `apps/backend/data/demo-export.tar` n'est pas régénéré (fichier du SOCLE) : avec l'export actuel, l'article
  composé n'existe pas et le check CONTENU est rouge. À régénérer à l'intégration.
- `apps/backend/types/generated/components.d.ts` est régénéré par `strapi develop` : non commité (hors périmètre).
- Les textes du seed SOCLE (citations, extraits) sont sans accents ; ils s'affichent tels quels dans les blocs.
