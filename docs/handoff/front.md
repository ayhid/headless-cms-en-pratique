# Handoff FRONT (phase 2)

Front Next.js **16.3.6** (App Router, Turbopack, Tailwind 4), dans `frontend/`. Sans `cacheComponents`
(non activé dans `next.config.ts`), donc modèle de cache « précédent » : `fetch` + `next.tags`.

## Ce qui marche (vérifié en `next build && next start -p 3006` contre Strapi 1343, et en `next dev`)

| URL | Contenu |
|---|---|
| `/` | Liste des articles fr publiés : cover, résumé, catégorie, auteur, date |
| `/en` | Même liste en anglais |
| `/articles/[slug]` | Détail fr : titre, métadonnées, résumé, cover, `<Blocks blocks={article.blocks} />`, encart auteur |
| `/en/articles/[slug]` | Détail en (le slug est localisé : `why-a-headless-cms`) |
| `/api/preview` | Entrée du Draft Mode (bouton Aperçu de Strapi) |
| `/api/preview/disable` | Sortie du Draft Mode (lien du bandeau) |

- **Bascule FR / EN** dans l'en-tête ; sur une page de détail elle pointe vers le slug de l'autre locale
  (`populate[localizations][fields]=slug,locale`), sinon vers la liste de l'autre locale.
- **SEO** : `generateMetadata` lit `shared.seo` (`metaTitle`, `metaDescription`, `shareImage`) avec repli sur
  title / excerpt / cover ; `og:image` absolue, `alternates.languages`, canonical.
- **Tokens** : `frontend/lib/strapi.ts` est le seul endroit qui lit `STRAPI_READ_TOKEN` / `STRAPI_PREVIEW_TOKEN`,
  uniquement côté serveur (pas de préfixe `NEXT_PUBLIC_`, `next/headers` importé, donc inutilisable dans un
  Client Component). Aucun token dans le HTML.
- **Erreurs lisibles** : Strapi arrêté ou token refusé : encadré rouge « Impossible de charger les articles »
  avec la cause en français (« Strapi est injoignable sur http://localhost:1337 : lancer npm run demo:start »,
  « Strapi refuse l'accès (HTTP 401) : vérifier STRAPI_READ_TOKEN dans frontend/.env »). Jamais le token.
- **404** propre (« Article introuvable ») pour un slug inconnu ou un brouillon hors aperçu (statut HTTP 404).
- `npx tsc --noEmit` et `npx eslint .` passent dans `frontend/`.

### Cache (mesuré)
- Pages rendues à la requête (`await connection()`), données Strapi dans le **Data Cache** :
  `fetch(url, { cache: 'force-cache', next: { tags } })` (`force-cache` explicite : sans lui, rien n'est mis en
  cache, a fortiori avec un header Authorization). Choix volontaire : `next build` n'a pas besoin de Strapi.
- Aligné avec le handoff WEBHOOKS : `revalidateTag(tag, { expire: 0 })` sur `articles` et `article:<slug>`.
  La mise en cache a été mesurée en production (`next start`) uniquement ; en `next dev`, ne pas s'en servir comme preuve.
- Tags : `articles` pour la liste (fr et en), `article:<slug>` pour le détail (slug de la locale affichée).
- Mesure : 3 affichages de la liste + 3 du détail = **0 requête** vers Strapi (logs `GET /api/articles` inchangés).
- En Draft Mode : `STRAPI_PREVIEW_TOKEN` + `status=draft`, `cache: 'no-store'` (Next contourne de toute façon tout cache).

### Preview (Draft & Publish)
`GET /api/preview?secret=<PREVIEW_SECRET>&slug=<slug>&locale=fr|en&status=draft|published`
- secret faux ou absent : 401 ; slug absent de Strapi même en brouillon : 404 ; Strapi injoignable : 502 ;
- `status=published` : Draft Mode désactivé, redirection vers la page publique ;
- sinon `draftMode().enable()` et redirection 307 vers le chemin calculé par le front (pas d'open redirect) ;
- sans `slug` : redirection vers la liste de la locale (en aperçu, elle montre aussi les brouillons).
- Bandeau jaune collant « Mode aperçu : brouillon » + bouton « Quitter l'aperçu » sur toutes les pages,
  badge « Brouillon » à la place de la date pour un article jamais publié.
- La config Strapi (`preview` dans `config/admin.ts`) est dans `docs/handoff/config-requests/front.md`,
  testée localement puis retirée avant commit.

Sorties réelles (production, Strapi 1343, front 3006) :
```
== / (fr)
200
Strapi et les agents IA via MCP
Modeliser avec des composants et des zones dynamiques
Revalidation a la demande avec Next.js
Le Document Service de Strapi 5
Pourquoi un CMS headless ?
== detail fr
200   <title>Pourquoi un CMS headless ? | Blog de démo Strapi</title>
== draft sans apercu
404
== preview mauvais secret
Secret d'aperçu invalide ou absent (PREVIEW_SECRET). 401
== preview OK
HTTP/1.1 307 Temporary Redirect
location: /articles/brouillon-plugin-maison
set-cookie: __prerender_bypass=...; Path=/; Secure; HttpOnly; SameSite=none
== draft avec cookie
200   Mode aperçu : brouillon / Brouillon : ecrire son propre plugin
== disable
307 -> /articles/brouillon-plugin-maison, cookie supprimé ; draft après disable : 404
```
`PORT=1343 FRONTEND_URL=http://localhost:3006 npm run demo:check` :
```
== FRONT
  [OK] Front http://localhost:3006/ : HTTP 200
  [OK] Liste fr : 5 titre(s) publie(s) affiche(s)
  [OK] Detail /articles/document-service-strapi-5 : HTTP 200
  [OK] Apercu du brouillon brouillon-plugin-maison : sans apercu HTTP 404, /api/preview HTTP 307 + cookie, avec apercu HTTP 200 + bandeau, mauvais secret HTTP 401
Tout est vert : 12/12 OK
```

## Ce que WEBHOOKS doit appeler (Next 16.3.6)

Signature (source : `frontend/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`) :
```ts
revalidateTag(tag: string, profile: string | { expire?: number }): void;
```
La forme à un argument est dépréciée. **Pour que la page soit à jour dès le rechargement suivant**, depuis un
Route Handler appelé par un webhook, la doc indique `{ expire: 0 }` (`updateTag` n'existe que dans les Server Actions) :
```ts
import { revalidateTag } from 'next/cache';
revalidateTag('articles', { expire: 0 });
revalidateTag(`article:${slug}`, { expire: 0 });   // slug de l'entrée publiée/dépubliée (entry.slug du payload)
```
Mesuré avec une route temporaire non commitée, après modification + publication réelle d'un titre dans Strapi :
```
profil "max"       : rechargement 1 = ANCIEN titre (stale-while-revalidate), rechargement 2 = nouveau titre
profil {expire: 0} : rechargement 1 = nouveau titre
```
Donc pour la démo en direct : `{ expire: 0 }`, pas `'max'`. Le payload du webhook contient `entry.slug` et
`entry.locale` : revalider `article:<entry.slug>` suffit (les slugs fr et en sont différents, chaque locale a
son tag). En cas de doute, revalider aussi `articles` couvre les deux listes.

## Attentes vis-à-vis de CONTENU
- `frontend/components/blocks/index.tsx` doit continuer d'exporter `Blocks({ blocks })` et le type `StrapiBlock`
  (importé par `frontend/lib/strapi.ts`). Si le type change de nom, le build casse.
- Les blocs sont rendus dans un conteneur `text-xl leading-relaxed text-zinc-800`, colonne `max-w-3xl`, fond blanc :
  pas besoin de forcer la taille de texte, mais pas de thème sombre.
- Les médias arrivent avec des URL relatives `/uploads/...` : utiliser `mediaUrl()` exporté par
  `@/lib/strapi` pour obtenir l'URL absolue (sinon les images de la galerie ne s'affichent pas).
- Populate fourni : `populate[blocks][populate]=*` (un niveau : les médias de `blocks.gallery` sont peuplés,
  pas les relations imbriquées plus profondes).

## Démo en 60 s
1. `http://localhost:3000` : 5 articles fr ; cliquer **EN** : la liste anglaise ; ouvrir un article, **FR** revient au slug fr.
2. Dans l'admin, ouvrir le brouillon « Brouillon : ecrire son propre plugin », bouton **Aperçu** : le brouillon
   s'affiche dans l'iframe avec le bandeau jaune. En parallèle, `http://localhost:3000/articles/brouillon-plugin-maison`
   dans un onglet normal : 404.
3. Modifier le titre d'un article publié, **Publier**, recharger `http://localhost:3000` : nouveau titre
   (webhook de WEBHOOKS + `revalidateTag(..., { expire: 0 })`).

## Ce qui casse si on touche à quoi
- **`STRAPI_URL`** (`frontend/.env`, forcé par `demo:start`) : les images sont servies depuis cette URL au
  navigateur ; Strapi doit être joignable à la même adresse depuis le navigateur et depuis Next.
- **`PREVIEW_SECRET`** : doit être identique dans `.env` (Strapi, handler de preview) et `frontend/.env`, sinon 401.
- **`FRONTEND_URL`** côté Strapi : sert d'URL de base au bouton Aperçu **et** à `allowedOrigins` (CSP `frame-src`
  de l'admin). Mauvaise valeur : iframe bloquée ou mauvais port.
- **Tags** `articles` / `article:<slug>` : les renommer dans `lib/strapi.ts` casse la revalidation de WEBHOOKS sans erreur visible.
- **Schéma article** : `lib/strapi.ts` lit `title`, `slug`, `excerpt`, `cover`, `author.name`, `author.bio`,
  `category.name`, `blocks`, `seo.*`, `localizations`. Renommer un de ces champs = page vide ou 404.
- **Draft Mode en production** : le cookie `__prerender_bypass` est `Secure; SameSite=None`. Chrome l'accepte sur
  `http://localhost`, mais pas sur une IP ou un nom d'hôte en HTTP simple (projeter depuis `localhost`, pas depuis
  `10.0.0.x`). En `next dev`, il est `SameSite=Lax` sans `Secure`.
- **Lien « Quitter l'aperçu »** : c'est un `<a>` volontairement, pas un `<Link>` (un prefetch supprimerait le cookie).
- **`next dev`** affiche l'URL complète de `/api/preview`, secret compris, dans le terminal : ne pas projeter
  le terminal du front pendant la démo de l'aperçu (secret de démo fictif, mais autant l'éviter).

## Écarts et remarques
- Le bouton « Aperçu » n'a pas été cliqué dans Chrome : se connecter à l'admin demande de saisir un mot de passe,
  ce que je ne fais pas. Vérifié à la place : l'endpoint que le bouton appelle
  (`GET /content-manager/preview/url/api::article.article`) renvoie la bonne URL, le CSP `frame-src` de l'admin
  autorise le front, le front n'envoie pas de `X-Frame-Options`, et l'URL générée, suivie avec cookies, affiche le
  brouillon avec bandeau. La liste, le détail, la bascule EN, l'aperçu et sa sortie ont été vérifiés dans Chrome.
- Les données du seed n'ont pas d'accents (« Modeliser », « Revalidation a la demande », « ecrire ») :
  c'est le contenu (SOCLE / CONTENU), le front affiche ce que Strapi renvoie. Tous les textes de l'interface sont accentués.
- L'interface reste en français aussi sur `/en` (règle du dépôt) ; seul le contenu est en anglais.
