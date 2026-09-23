# Config request : CONTENU

> **Monorepo Turborepo (23/09)** : Strapi vit désormais dans `apps/backend/` et le front dans `apps/frontend/`.
> Les chemins de ce document ont été réécrits en conséquence ; un `.env` sans préfixe désigne `apps/backend/.env`.
> Les commandes `npm run ...` se lancent depuis la racine du dépôt ; les extraits de `package.json` cités plus bas
> sont ceux de `apps/backend/package.json`. `scripts/demo-start.mts` n'existe plus : `npm run demo:start` passe par
> turbo. Détails : `docs/handoff/socle.md`, section « Monorepo Turborepo ».

Aucune modification de fichier de configuration n'est nécessaire : le populate du contrat FRONT suffit
(galerie comprise), aucune dépendance npm n'est ajoutée (le rendu du texte riche est fait maison,
sans `@strapi/blocks-react-renderer`) et le schéma d'article n'est pas modifié.

Il reste trois actions pour la passe d'intégration.

## 1. `apps/backend/data/demo-export.tar` (à régénérer)
- Pourquoi : l'export actuel ne contient pas l'article composé `composer-un-article-bloc-par-bloc`.
  Attention, l'import de l'ancien export **réussit quand même** avec les nouveaux schémas
  (les champs ajoutés, `role` et `caption`, sont optionnels) : `demo:reset` ne bascule donc PAS
  sur le seed, et l'article composé manque en silence. Le check CONTENU passe alors au rouge.
- Changement exact : sur la base intégrée,
```bash
rm apps/backend/data/demo-export.tar && npm run demo:reset   # repli seed : SOCLE + seeds des agents
npm run demo:export                             # fige le nouvel export
npm run demo:reset && npm run demo:check        # vérifie que l'import restaure bien l'article composé
```
- Variables d'environnement nouvelles : aucune.
- Dépendances npm : aucune.
- Comment vérifier : `demo:check`, section CONTENU, 3 lignes `[OK]`.

## 2. `apps/backend/types/generated/components.d.ts` (fichier généré)
- Pourquoi : `strapi develop` le régénère à partir des nouveaux schémas de `apps/backend/src/components`
  (displayName, `role`, `caption`, `required`). Hors de mon périmètre, je ne l'ai pas commité.
- Changement exact : laisser `strapi develop` le régénérer au premier démarrage de l'intégration, puis le commiter.
- Comment vérifier : `git diff apps/backend/types/generated/components.d.ts` montre `role` dans `BlocksQuote` et `caption` dans `BlocksGallery`.

## 3. `apps/frontend/next.config.ts` (remarque, aucun changement demandé)
- Pourquoi : mes composants utilisent `<img>` (pas `next/image`) avec l'URL préfixée par
  `NEXT_PUBLIC_STRAPI_URL` ou `STRAPI_URL`. Ils ne dépendent donc pas de `images.remotePatterns`,
  qui n'autorise que le port 1337 et aurait cassé le rendu en phase 2 (port 1341).
- Changement exact : aucun. Si FRONT passe les blocs à `next/image`, il faudra élargir `remotePatterns`.
