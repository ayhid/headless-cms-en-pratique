# DEMO.md : déroulé de la démo live (7 minutes)

Talk « Headless CMS en pratique : Strapi au-delà du simple CMS », 23 septembre, 18h30.
Démo en direct de 7 minutes maximum, au milieu d'un talk de 30 minutes, devant un public mixte
(développeurs et consultants). Tout tourne en local : Strapi 5.54.0 sur http://localhost:1337,
front Next.js 16 en mode production sur http://localhost:3000.
Le dépôt est un monorepo Turborepo : Strapi dans `apps/backend/`, le front dans `apps/frontend/`. **Toutes les
commandes se tapent depuis la racine du dépôt** (`~/projects/strapi-prez-demo`).

Légende :
- **[vérifié]** : geste rejoué par API ou en ligne de commande pendant la répétition à blanc du 23/09 (11h58 à 12h03).
- **[à répéter à l'œil]** : clic dans l'admin ou le navigateur, non joué pendant la répétition à blanc
  (on ne saisit pas de mot de passe dans un navigateur automatisé). Le résultat attendu vient de la
  répétition par API, les libellés viennent des traductions françaises de Strapi 5.54.0 relevées dans
  les handoffs. À faire une fois en vrai avant 18h30.

Identifiants de démo (fictifs, dans `apps/backend/.env`) : `admin@example.com` / `DemoStrapi2026!` (Camille Demo).

---

## 1. Préparation, 30 minutes avant (vers 18h00)

### 1.1 Machine

| Quoi | Comment |
|---|---|
| Notifications coupées | macOS : Centre de contrôle > Concentration > **Ne pas déranger** (pour 2 heures). Fermer Slack, Mail, Messages. |
| Mise en veille désactivée | Réglages Système > Écran verrouillé : « Éteindre l'écran » sur **Jamais** (secteur branché). Ou, dans un terminal non projeté : `caffeinate -dis` (laisser tourner). |
| Wifi | Strapi, le front, les webhooks, les crons et le plugin sont 100 % locaux : ils marchent wifi coupé. **Seule exception : l'étape MCP**, car Claude Code appelle le modèle sur Internet. Garder le wifi (ou le partage de connexion du téléphone) pour l'étape 7, ou le couper et jouer directement le plan B `bash docs/mcp/mcp-curl.sh`, entièrement local. |
| Écran | Recopie vidéo ou bureau étendu choisi à l'avance ; résolution projetée 1920 x 1080 de préférence. |
| Zoom du navigateur | 125 % à 1920 px de large (Cmd +), 110 % au plus à 1280 px. Vérifier que la colonne de droite de l'édition d'article (« Entrée », « CHECK-LIST DE PUBLICATION ») reste affichée : sous une certaine largeur le Content Manager la replie. **[à répéter à l'œil]** |
| Terminaux | Police à 20 pt au moins, thème clair, fenêtres nommées (T1 à T5 ci-dessous). |

### 1.2 Terminaux (tous à la racine, `~/projects/strapi-prez-demo`)

| Terminal | Projeté ? | Commande |
|---|---|---|
| **T1 Serveurs** | **NON** (TUI de Turborepo : tous les logs, dont ceux du front) | `npm run demo:reset` puis `npm run demo:start` |
| **T2 Webhook** | oui | `tail -n 0 -F apps/frontend/logs/front.log \| grep --line-buffered '\[webhook\]'` |
| **T3 Cron** | oui | `tail -n 5 -F apps/backend/logs/crons.log` |
| **T4 Commandes** | oui | taper sans valider : `npx tsx apps/backend/scripts/crons/schedule-demo-article.ts 75` |
| **T5 Claude Code** | oui | `set -a; . apps/backend/.env; set +a` puis `claude --mcp-config .mcp.json.example --strict-mcp-config --allowedTools "mcp__strapi__*"` |

Remarques sur les terminaux :
- `demo:reset` refuse de tourner si Strapi écoute déjà sur 1337 : l'enchaîner **avant** `demo:start`.
  Mesuré le 23/09 après le passage en monorepo : 6,4 s (dont environ 3 s de build du plugin). Strapi et le
  front répondent **9 s** après `demo:start` (build du plugin et `next build` compris).
- **T1 est la TUI de Turborepo** : à gauche la liste des tâches (`backend#plugin:build`, `frontend#build`,
  puis les deux serveurs `backend#demo:start` et `frontend#demo:start`), à droite les logs de la tâche
  sélectionnée. Touches (doc Turborepo et pied de page de la TUI) :
  - `↑` / `↓` (ou `j` / `k`) : passer d'une tâche à l'autre, donc des logs de Strapi à ceux du front ;
  - `u` / `d` : faire défiler les logs, `U` / `D` : page par page, `t` / `b` : haut / bas des logs ;
  - `/` : chercher une tâche ; `h` : masquer ou afficher la liste des tâches ; `p` : épingler la sélection ;
  - `m` : afficher toutes les touches ; `i` : taper dans la tâche sélectionnée, `Ctrl+Z` pour en sortir
    (inutile pendant la démo) ;
  - `Ctrl+C` : arrête Strapi et le front ensemble.
  Filet si la TUI gêne : `npm run demo:start -- --ui=stream` affiche les logs à la suite, préfixés
  `backend:demo:start:` et `frontend:demo:start:`. Turborepo passe aussi tout seul en mode stream quand il
  est lancé par un agent IA (variable `CLAUDECODE` ou `AI_AGENT`, par exemple depuis Claude Code) :
  toujours lancer T1 dans un terminal ordinaire.
- T2 lit `apps/frontend/logs/front.log`, copie de la sortie de `next start` écrite par le script du front
  (`apps/frontend/scripts/start-with-log.sh`, fichier vidé à chaque démarrage ; `tail -F` suit le fichier
  recréé). On projette seulement les lignes `[webhook]`, jamais les logs du front, qui peuvent afficher le
  secret de preview (en `next dev`, l'URL `/api/preview?secret=...` apparaît en clair). Vérifié : écrire
  dans `apps/backend/logs/` ne redémarre pas Strapi (1 seul « Strapi started successfully » pendant toute
  la répétition), et en mode production aucune ligne ne contient `secret=`.
- Le même script vide le cache de données de Next (`apps/frontend/.next/cache/fetch-cache`) à chaque
  démarrage : ce cache survit sur disque à un redémarrage alors que les invalidations par webhook sont
  gardées en mémoire, et un front relancé après `demo:reset` pouvait resservir le contenu de la
  répétition précédente (constaté le 23/09 pendant le passage en monorepo, corrigé et vérifié).
- T5 : `.mcp.json.example` (et non `.mcp.json`) est passé explicitement, rien n'est ajouté à la config
  globale de Claude Code. `--allowedTools "mcp__strapi__*"` évite la demande d'autorisation à chaque
  tool pendant la démo. Dans la session, taper `/mcp` : `strapi` doit être **connecté**, puis `/clear`
  pour repartir d'un écran propre. Au premier lancement dans ce dossier, Claude Code peut demander de
  faire confiance au dossier : répondre maintenant, pas devant le public. **[à répéter à l'œil]**

### 1.3 Vérification unique

Dans T4, **au moins 30 s après `demo:start`** (premier passage du cron, qui publie l'article programmé
du seed ; lancé avant, la section CRONS affiche 2 KO attendus) :

```bash
npm run demo:check
```

Sortie réelle obtenue le 23/09 à 11h59 (demo:reset, demo:start, premier cron à 11:59:30), complétée à 14h26
par les deux lignes « Mode révélateur » de la section PLUGIN. Rejouée à l'identique à 14h52 après le passage en
monorepo (deux passes de suite, 35/35, seule la ligne du cron varie) :

```
Vérification de la démo (Strapi : http://localhost:1337, front : http://localhost:3000)

== SOCLE
  [OK] Strapi répond sur http://localhost:1337 (HTTP 204)
  [OK] API fr : 7 article(s) publié(s), 7 avec image de couverture (token lecture seule)
  [OK] API en : 7 article(s) publié(s), 7 avec image de couverture (token lecture seule)
  [OK] Token preview : 8 version(s) brouillon lisible(s) avec status=draft, contre 7 publiée(s)
  [OK] Admin admin@example.com : login OK, Content Manager liste 8 article(s) fr (HTTP 200)
  [OK] Webhook "Revalidation front Next.js" vers http://localhost:3000/api/revalidate (entry.publish, entry.unpublish)
  [OK] Aucun tiret cadratin (U+2014) dans le dépôt
  [OK] Version Strapi 5.54.0 (5.47.0 minimum requise pour le serveur MCP)
== CONTENU
  [OK] Components présents : blocks.rich-text, blocks.quote, blocks.gallery, shared.seo
  [OK] Article composé publié en fr : 3 bloc(s) (blocks.rich-text, blocks.quote, blocks.gallery), 3 image(s) de galerie, SEO rempli (populate du contrat FRONT)
  [OK] Article composé publié en en : 3 bloc(s) (blocks.rich-text, blocks.quote, blocks.gallery), 3 image(s) de galerie, SEO rempli (populate du contrat FRONT)
== CRONS
  [OK] Cron activé, tâches déclarées : publishScheduledArticles, draftsDigest (mode démo : 30 s et 1 min)
  [OK] logs/crons.log écrit il y a 1 s (maximum attendu : 90 s)
  [OK] Aucun brouillon en retard : tout article dont publishAt est passé est publié
== FRONT
  [OK] Front http://localhost:3000/ : HTTP 200
  [OK] Liste fr : 7 titre(s) publié(s) affiché(s)
  [OK] Détail /articles/pourquoi-un-cms-headless : HTTP 200
  [OK] Aperçu du brouillon brouillon-plugin-maison : sans aperçu HTTP 404, /api/preview HTTP 307 + cookie, avec aperçu HTTP 200 + bandeau, mauvais secret HTTP 401
== MCP
  [OK] MCP actif : POST /mcp sans token répond 401 (Authentication required)
  [OK] MCP : token Content API (STRAPI_READ_TOKEN) rejeté par /mcp (HTTP 401, 401 attendu)
  [OK] MCP : Admin token complet, tools/list expose 8 tools article (dont delete_article et publish_article)
  [OK] MCP : Admin token complet, 10 tools médiathèque, aucun tool hors article et médias
  [OK] MCP : Admin token lecture seule, seulement list_article et get_article (pas de publish_article)
  [OK] MCP : Admin token lecture seule, 3 tools médiathèque, aucun tool hors article et médias
== PLUGIN
  [OK] Plugin editorial-toolkit compilé (dist/server et dist/admin présents)
  [OK] Mode révélateur : 6 injection zones dans le build admin (listView.actions, listView.publishModalAdditionalInfos, listView.unpublishModalAdditionalInfos, listView.deleteModalAdditionalInfos, editView.right-links, preview.actions), pas editView.informations
  [OK] Mode révélateur : zones affichées par le Content Manager installé : listView.actions, editView.right-links, preview.actions ; déclarées mais non affichées : listView.publishModalAdditionalInfos, listView.unpublishModalAdditionalInfos, listView.deleteModalAdditionalInfos
  [OK] Plugin chargé : « Boîte à outils éditoriale » listé par GET /admin/plugins
  [OK] Custom field plugin::editorial-toolkit.tone enregistré (type natif string)
  [OK] Article utilise le custom field dans l’attribut « tone »
  [OK] Tableau de bord : 15 article(s) (fr 8, en 7), 0 brouillon(s) prêt(s) à publier, 1 à compléter
  [OK] MCP : tool editorial_checklist listé (4 tools pour un jeton lecture articles)
== WEBHOOKS
  [OK] http://localhost:3000/api/revalidate sans secret : HTTP 401 (401 attendu)
  [OK] Publication simulée d'un article : HTTP 200, tags revalidés : articles, article:revalidation-a-la-demande
  [OK] entry.update simulé : HTTP 200, ignoré, rien de revalidé

Tout est vert : 35/35 OK
```

Seule la ligne « logs/crons.log écrit il y a N s » varie (le chemin est relatif à `apps/backend/`). Tout autre écart : ne pas commencer, voir la
section 5. Ne **pas** relancer `demo:check` après avoir commencé la démo (les compteurs changent).

### 1.4 Connexion à l'admin, à faire maintenant

Ouvrir http://localhost:1337/admin et se connecter (`admin@example.com` / `DemoStrapi2026!`, bouton
**Se connecter**). **Attention : 5 connexions au plus par 5 minutes.** Au-delà, l'admin répond 429 et il
faut attendre 5 minutes ou redémarrer Strapi (Ctrl+C dans T1 puis `npm run demo:start ...`).
Consomment chacun une connexion : le navigateur, le premier `demo:check` après un reset (les suivants
réutilisent le jeton gardé dans `.tmp/`), `schedule-demo-article.ts` (étape 5) et `mcp-curl.sh` (plan B).
Un `demo:reset` recrée l'admin : il faut se reconnecter dans le navigateur ensuite.

Thème clair de l'admin : menu utilisateur en bas de la barre latérale gauche (initiales « CD ») >
**Profil** > section **Expérience** > **Mode d'interface** : choisir le mode clair (libellé « Mode light »,
le nom du thème n'est pas traduit), puis **Enregistrer**. **[à répéter à l'œil]**
Le front n'a qu'un thème, clair.

### 1.5 Onglets du navigateur, dans cet ordre

Ouvrir le front par `localhost`, **jamais par une IP** : le cookie du mode aperçu (`Secure; SameSite=None`)
n'est accepté par Chrome que sur `http://localhost`.

| # | Onglet | URL exacte |
|---|---|---|
| 1 | Content-Type Builder, Article | http://localhost:1337/admin/plugins/content-type-builder/content-types/api::article.article |
| 2 | Content Manager, liste Article (fr) | http://localhost:1337/admin/content-manager/collection-types/api::article.article?plugins[i18n][locale]=fr |
| 3 | Content Manager, « Composer un article bloc par bloc » | http://localhost:1337/admin/content-manager/collection-types/api::article.article/pjmu3k3t4okswmnvjmwp2683?plugins[i18n][locale]=fr |
| 4 | Front, un article | http://localhost:3000/articles/composer-un-article-bloc-par-bloc |
| 5 | Front, liste fr | http://localhost:3000/ |
| 6 | Admin, page Webhooks | http://localhost:1337/admin/settings/webhooks |
| 7 | Tableau de bord du plugin | http://localhost:1337/admin/plugins/editorial-toolkit |
| (base) | Admin, accueil | http://localhost:1337/admin |

L'identifiant `pjmu3k3t4okswmnvjmwp2683` de l'onglet 3 vient de `apps/backend/data/demo-export.tar` : il est identique
après chaque `demo:reset` (vérifié sur deux resets). S'il ne s'ouvre pas, passer par l'onglet 2 et cliquer
sur la ligne « Composer un article bloc par bloc ».

Mode révélateur : dans l'onglet 7, l'interrupteur **Afficher les injection zones** doit être sur
**Masquées** (état voulu au départ : désactivé). Il est gardé dans le `localStorage` du navigateur : un
`demo:reset` ne le remet **pas** à zéro, une répétition précédente a pu le laisser activé. Vérifier aussi
qu'aucune étiquette en pointillés « INJECTION ZONE » n'apparaît dans l'onglet 2. **[à répéter à l'œil]**

Dernier coup d'œil : T2 vide, T3 affiche « Aucun article programmé à publier. » toutes les 30 s, T4 a la
commande tapée sans l'avoir validée, T5 affiche l'invite de Claude Code.

---

## 2. Séquence minutée (7:00 maximum)

Durées machine mesurées pendant la répétition à blanc (23/09, 11h58 à 12h03) :

| Mesure | Valeur |
|---|---|
| Enregistrement d'un article (PUT de l'API du Content Manager) | 0,02 s |
| Publication, webhook, puis page du front à jour | **0,12 s** après la publication, dès le premier rechargement |
| Cron : lancement du script à 11:59:58 avec `75` | parution prévue 12:01:13, publiée par le cron à **12:01:30** (17 s après l'heure prévue, 92 s après le lancement) |
| Réponse de l'agent MCP (`claude -p`, prompt de l'étape 7) | **10 s** puis **11 s** (deux essais) |
| `npm run webhooks:simulate` | 0,3 s |
| `bash docs/mcp/mcp-curl.sh` | 0,3 s |

Le cron publie à chaque seconde 00 et 30 de l'horloge : un article programmé sort **0 à 30 s** après son
`publishAt`. Avec `75` lancé à 2:45, `publishAt` tombe à 4:00 et la publication entre **4:00 et 4:30**,
donc pendant l'étape 5 (3:45 à 4:45), quelle que soit la seconde de l'horloge.

### Étape 1 : modéliser (0:00 à 1:00), onglet 1

| Geste | À dire | Le public voit |
|---|---|---|
| Onglet 1 (Content-Type Builder > Article). **[à répéter à l'œil]** | « Un article, ce n'est pas une page : c'est une structure. Titre, slug, image, auteur, catégorie : des champs typés, pas du HTML. » | La liste des champs : title, slug, cover, excerpt, tone, author, category, blocks, seo, publishAt. |
| Montrer le champ **blocks** (zone dynamique) et ses 3 composants : Texte riche, Citation, Galerie ; puis **seo** (composant SEO, réutilisé par Catégorie). | « La rédaction compose la page avec des briques que le développeur a définies. Le SEO est un composant partagé : défini une fois, réutilisé partout. » | Les composants dans la zone dynamique. |
| Cliquer **Ajouter un autre champ**, onglet **Personnalisé** : la carte « Ton éditorial ». Puis Échap. **Ne rien enregistrer.** | « Et quand le métier a un besoin précis, on étend l'admin : ce champ vient de notre plugin, on y revient tout à l'heure. » | La carte « Ton éditorial » du plugin. |

Ne jamais cliquer **Enregistrer** dans le Content-Type Builder : Strapi redémarre et le schéma diverge de
l'export (le prochain `demo:reset` passerait en mode seed).

### Étape 2 : composer (1:00 à 2:00), onglet 3

| Geste | À dire | Le public voit |
|---|---|---|
| Onglet 3 « Composer un article bloc par bloc », descendre à la zone **blocks**. **[à répéter à l'œil]** | « Voici ce que voit un rédacteur : pas de code, des blocs. » | Texte riche, Citation (Léa Fontaine), Galerie de 3 images. |
| Cliquer **Ajouter un composant à blocks** > catégorie **blocks** > **Citation**. Remplir `text` : `Publier, c'est déjà relire.`, `author` : `Hugo Lambert`, `role` : `Rédacteur invité`. | « J'ajoute une citation, comme le ferait un consultant ou une rédactrice. » | Le 4e bloc, Citation. |
| Cliquer **Enregistrer** (Cmd + Entrée). **Pas encore Publier.** [vérifié par API : statut passe à « modifié », 4 blocs] | « C'est enregistré, mais pas publié : Strapi garde un brouillon à côté de la version en ligne. » | Notification d'enregistrement, statut Modifié. |

### Étape 3 : lire côté front (2:00 à 2:45), onglets 4 et 5

| Geste | À dire | Le public voit |
|---|---|---|
| Onglet 4 (front, même article), recharger (Cmd + R). [vérifié : la citation « Hugo Lambert » n'y est pas] | « Côté site, rien n'a bougé : le front ne lit que la version publiée, via l'API et un jeton en lecture seule. » | L'article avec 3 blocs, sans la nouvelle citation. |
| Onglet 5 (liste fr) : montrer les cartes, puis revenir à l'onglet 4. | « Ce front est un Next.js en mode production : il met les réponses de Strapi en cache. Il ne redemande rien tant qu'on ne lui dit pas que le contenu a changé. » | La liste des 7 articles fr. |

### Étape 4 : publier et voir le webhook (2:45 à 3:45), T4, onglets 3, 6, T2, 4

| Geste | À dire | Le public voit |
|---|---|---|
| **2:45, en premier** : T4, valider `npx tsx apps/backend/scripts/crons/schedule-demo-article.ts 75` (déjà tapée). [vérifié] | « Au passage, je programme un article pour dans un peu plus d'une minute. On le laisse tomber tout seul. » | `Brouillon fr créé : « Parution programmée en direct (HH:MM:SS) »` et `Parution prévue à HH:MM:SS`. |
| Onglet 6 (Paramètres > Webhooks), 5 s. **[à répéter à l'œil]** | « Strapi prévient le front à chaque publication : c'est un webhook, un simple appel HTTP signé. » | Le webhook « Revalidation front Next.js ». |
| Onglet 3, cliquer **Publier** (Cmd + Maj + Entrée). [vérifié par API] | « Je publie. » | Statut Publié. |
| Montrer T2. [vérifié] | « Le front a reçu l'événement et a invalidé exactement deux entrées de son cache : la liste et cet article. » | `[webhook] entry.publish article "Composer un article bloc par bloc" (fr) -> tags revalidés : articles, article:composer-un-article-bloc-par-bloc` |
| Onglet 4, recharger. [vérifié : 0,12 s après la publication, la citation est là] | « Pas de redéploiement, pas de rebuild : le site est à jour au rechargement suivant. » | La citation « Publier, c'est déjà relire. » (Hugo Lambert) en encart. |

### Étape 5 : laisser tomber le cron (3:45 à 4:45), T3, T4, onglets 2 et 5

| Geste | À dire | Le public voit |
|---|---|---|
| Onglet 2 (liste Article fr), recharger. **[à répéter à l'œil]** | « L'article programmé est là, en brouillon, avec sa date de parution. Personne n'y touche. » | « Parution programmée en direct (HH:MM:SS) », statut Brouillon. |
| Montrer T3 et attendre (entre 4:00 et 4:30). [vérifié : 17 s après l'heure prévue] | « Strapi embarque un planificateur de tâches : toutes les 30 secondes en démo, toutes les 5 minutes en vrai. Il publie ce qui est dû. » | `[cron publication HH:MM:SS] Publié : « Parution programmée en direct (HH:MM:SS) » (fr), ...` ; T4 affiche `Publié ! GET /api/articles?locale=fr le renvoie`. |
| Montrer T2, puis onglet 5 (liste fr), recharger. [vérifié] | « Et comme c'est une publication comme une autre, le webhook est parti tout seul : le cron publie, le webhook met le site à jour. » | Nouvelle ligne `[webhook] entry.publish article "Parution programmée en direct ..."` ; l'article en tête de liste. |

Si la seconde 15 d'une minute passe pendant l'attente, T3 affiche aussi le « Récapitulatif des brouillons
en attente » (deuxième tâche cron) : le commenter en une phrase, c'est le rapport qu'on enverrait à la
rédaction chaque matin.

### Étape 6 : montrer le plugin (4:45 à 6:00), onglets 7, 2 puis 7

| Geste | À dire | Le public voit |
|---|---|---|
| Onglet 7 (icône plume, « Boîte à outils éditoriale »), cliquer **Actualiser**. **[à répéter à l'œil]** [vérifié par API : route du tableau de bord OK] | « Un plugin maison, écrit avec les briques officielles : le tableau de bord de la rédaction, ce qui est prêt et ce qui manque. » | Compteurs, tableau par locale, « Brouillons à compléter » : « Brouillon : écrire son propre plugin » avec le badge « DATE DE PARUTION ». |
| **Mode révélateur (environ 30 s)** : en haut de la page, cliquer l'interrupteur **Afficher les injection zones** (passe de « Masquées » à « Affichées »). **[à répéter à l'œil]** | « Pour étendre l'admin, Strapi offre deux outils. Je vous rends visibles les emplacements du second, les injection zones. » | L'interrupteur sur « Affichées ». |
| Onglet 2 (liste Article fr), **sans recharger**. **[à répéter à l'œil]** | « Le réglage passe d'un onglet à l'autre en direct, sans recharger ni redémarrer Strapi. » | À droite de la barre de recherche et des filtres, avant l'icône d'engrenage : une étiquette en pointillés « INJECTION ZONE `listView.actions` ». |
| Revenir à l'onglet 7, cliquer **Ouvrir** sur « Brouillon : écrire son propre plugin ». Colonne de droite, panneau « Entrée ». **[à répéter à l'œil]** | « Ma check-list passe par les Content Manager APIs, c'est ce que la doc recommande pour un panneau ou une action. Les injection zones, elles, servent à viser un emplacement précis que ces API ne couvrent pas, comme ici sous les boutons de publication. » | Sous **Publier** et **Enregistrer** : l'étiquette « INJECTION ZONE `editView.right-links` » avec `props : slug` ; juste en dessous, le panneau **CHECK-LIST DE PUBLICATION** (4 sur 6, « À COMPLÉTER »). |
| Champ **tone** : cliquer la pastille **Pédagogique**. **Ne pas enregistrer.** | « La check-list se met à jour pendant la saisie, avant d'enregistrer. Et c'est le custom field vu à l'étape 1. » | Le panneau passe à 5/6. |

Ne pas remplir `publishAt` et enregistrer : avec une date passée, le cron publierait le brouillon dans les
30 s. Laisser cet onglet tel quel (modifications non enregistrées), l'étape suivante utilise l'onglet 2.
Le mode révélateur reste activé pendant l'étape 7 : l'étiquette `listView.actions` restera visible dans
l'onglet 2, c'est sans effet sur la démo (le désactiver après, section 4).

**Pas de geste dans les fenêtres de confirmation.** La doc liste `listView.publishModalAdditionalInfos`,
`unpublishModalAdditionalInfos` et `deleteModalAdditionalInfos`, et le plugin y injecte bien son étiquette,
mais le Content Manager 5.54.0 ne les affiche nulle part : ces zones sont déclarées (le plugin i18n les
utilise aussi) sans qu'aucun écran ne les rende, et la liste n'a pas de bouton « Publier » par ligne
(publication groupée seulement, fenêtre sans injection zone). Vérifié dans
`node_modules/@strapi/content-manager/dist/admin` (node_modules de la racine du dépôt) ; `demo:check` le rappelle (« déclarées mais non affichées »).
Si une question vient là-dessus : « la doc les liste, cette version ne les affiche pas encore, c'est
exactement pour ça qu'on préfère les API typées ». Même prudence pour `editView.informations`, que la doc
dit interne : le plugin ne l'utilise pas.

Facultatif, hors minutage : bouton **Aperçu** de l'édition d'article, l'étiquette `preview.actions`
apparaît dans l'en-tête de l'aperçu. **[à répéter à l'œil]**

### Étape 7 : l'agent MCP écrit un brouillon (6:00 à 7:00), T5 puis onglet 2

| Geste | À dire | Le public voit |
|---|---|---|
| T5 : coller le prompt ci-dessous, Entrée. [vérifié avec `claude -p` : 10 à 11 s] | « Dernière chose : Strapi 5 expose un serveur MCP. Un agent IA peut piloter le CMS, mais seulement avec les droits de son jeton. Je lui demande un brouillon. » | L'agent appelle `create_article` (tool `mcp__strapi__create_article`) puis répond en trois lignes. |
| Onglet 2 (liste Article fr), **recharger** (Cmd + R). **[à répéter à l'œil]** [vérifié par API : `status: draft`, créé par Camille] | « Le voilà, en brouillon. L'agent écrit, l'humain relit et publie : c'est le jeton qui fixe la limite, pas la bonne volonté du modèle. » | « Strapi et l'IA : un brouillon écrit par Claude », statut Brouillon. |

Prompt exact à coller dans T5 :

```
Utilise uniquement le serveur MCP strapi. Crée un brouillon d'article en français (locale fr) avec le titre « Strapi et l'IA : un brouillon écrit par Claude », le slug « strapi-ia-brouillon-claude » et le résumé « Premier jet rédigé par un agent via le serveur MCP de Strapi, en attente de relecture humaine. ». Ne publie rien. Réponds en français, en trois lignes au plus, sans tableau et sans tiret cadratin : le titre, le documentId et le statut.
```

Réponse réelle obtenue pendant la répétition (le documentId change à chaque fois) :

```
Titre : Strapi et l'IA : un brouillon écrit par Claude
documentId : af9orub7weh29tftvosty8q6
Statut : brouillon, rien n'a été publié
```

Rejouer ce prompt sans `demo:reset` crée un **second** brouillon avec le même slug (vérifié : 2 articles
`strapi-ia-brouillon-claude` après deux essais, sans erreur). D'où le `demo:reset` entre deux répétitions.

Minutage : l'étape 7 passe de 1:30 à 1:00 pour laisser 30 s au mode révélateur de l'étape 6. L'agent
répond en 10 à 11 s : le temps rogné est la marge d'attente, pas un geste. Si l'agent dépasse 20 s,
passer au plan B sans attendre.

Hors minutage, seulement s'il reste du temps ou pendant les questions (bonus, 20 s) : « Donne-moi la check-list éditoriale de l'article brouillon-plugin-maison,
en trois lignes, sans tableau et sans tiret cadratin. » L'agent appelle le tool `editorial_checklist` du plugin.
**[non répété avec Claude Code : à répéter à l'œil]**

---

## 3. Plans B, étape par étape

Règle : si un geste rate, on ne débogue pas en direct. On bascule sur le plan B en une phrase
(« je vous montre la version enregistrée ») et on continue le minutage.

| Étape | Symptôme | Plan B en direct | Slide filet |
|---|---|---|---|
| 1. Modéliser | Content-Type Builder vide, lent, ou Strapi qui redémarre | Montrer le schéma dans l'éditeur : `apps/backend/src/api/article/content-types/article/schema.json` (champ `blocks` de type `dynamiczone`). | Slide 12 : capture du Content-Type Builder, Article (zone dynamique et composants) |
| 2. Composer | Bouton introuvable, enregistrement refusé | Montrer la capture, puis enchaîner sur l'étape 3 avec l'article tel quel. | Slide 13 : capture de l'écran de composition avec les 4 blocs (dont la citation Hugo Lambert) |
| 3. Lire côté front | Front en erreur (encadré rouge « Impossible de charger les articles ») ou page blanche | Dans T4 : `set -a; . apps/backend/.env; set +a; curl -s -g "http://localhost:1337/api/articles?locale=fr&filters[slug][\$eq]=composer-un-article-bloc-par-bloc&populate[blocks][populate]=*" -H "Authorization: Bearer $STRAPI_READ_TOKEN" \| head -c 600` : même contenu, en JSON. [vérifié] | Slide 14 : capture de l'article sur le front, à côté de sa réponse JSON |
| 4. Publier et webhook | T2 reste vide, ou la page ne change pas | Dans T4 : `npm run webhooks:simulate` (3 cas : 200, 401, ignoré ; 0,3 s) [vérifié]. Si le front est en `next dev`, le cache ne se voit pas : l'annoncer et passer à la slide. | Slide 15 : schéma Publier > webhook > revalidateTag, avec la ligne de log `[webhook] entry.publish ...` |
| 5. Cron | Rien après 4:40 (publication non vue) | Ne pas attendre plus : montrer dans T3 la ligne « Publié : « Publication programmée par un cron » » du démarrage (le seed publié à 30 s), ou relancer `npx tsx apps/backend/scripts/crons/schedule-demo-article.ts 5` et continuer (la publication arrivera pendant l'étape 6). | Slide 16 : capture de `apps/backend/logs/crons.log` avec « Publié : « Parution programmée en direct ... » » |
| 6. Plugin | Menu plume absent, page en erreur | Dans T4 : `npm run demo:check 2>&1 \| grep -A8 "== PLUGIN"` (plugin chargé, injection zones du build, custom field, tableau de bord). | Slide 17 : captures du tableau de bord éditorial et du panneau CHECK-LIST DE PUBLICATION |
| 6. Mode révélateur | Pas d'étiquette après l'interrupteur (onglet chargé avant le build, cache) | Ne pas insister : recharger l'onglet 2 une fois (Cmd + R) ; si rien, passer à la slide, dire la phrase clé et continuer avec la check-list. | Slide 17 bis : tableau « Injection zones vs. Content Manager APIs » de la doc (https://docs.strapi.io/cms/plugins-development/admin-injection-zones), à côté des captures des étiquettes `listView.actions` et `editView.right-links` |
| 7. MCP | Pas de réseau, agent lent (plus de 30 s), réponse bavarde | Échap dans T5, puis dans T4 : `bash docs/mcp/mcp-curl.sh` (0,3 s, entièrement local) : 401 pour un jeton Content API, tools du jeton complet, brouillon créé, refus de `publish_article` pour le jeton lecture seule. [vérifié] Puis recharger l'onglet 2 : brouillon « brouillon-mcp-curl-HHMMSS ». | Slide 18 : capture du Content Manager avec le brouillon MCP |
| Tout | Strapi planté, 429 au login, machine figée | Ne pas redémarrer devant le public. Dérouler les slides 12 à 18. | Slides 12 à 18 |

Numérotation des slides donnée à titre indicatif : à aligner sur le deck final.

---

## 4. Après la démo, ou entre deux répétitions

1. T1 : Ctrl+C dans la TUI (arrête Strapi et le front ensemble). T2 s'arrête de lui-même quand on le ferme ; T3 peut rester.
2. T1 : `npm run demo:reset` (environ 6 s ; refuse si Strapi tourne encore).
3. T1 : `npm run demo:start` (TUI). T2 n'a pas besoin d'être relancé : `tail -F` suit
   `apps/frontend/logs/front.log`, vidé à chaque démarrage du front ; en cas de doute, le relancer.
4. Attendre 30 s (premier passage du cron), puis `npm run demo:check` : 35/35.
5. Navigateur : se reconnecter à l'admin (le reset recrée l'admin), recharger les onglets.
6. T5 : `/clear` dans Claude Code.
7. Onglet 7 : remettre l'interrupteur **Afficher les injection zones** sur **Masquées** (état voulu au départ
   de la démo). Le reset ne touche pas au navigateur : sans ce geste, les étiquettes sont déjà là au début.

Pourquoi le reset est obligatoire : sans lui, la citation Hugo Lambert est déjà là (étape 2), le brouillon
MCP existe déjà et le prompt en crée un doublon de slug (étape 7), l'article programmé de la répétition
précédente encombre la liste, et le ton choisi à l'étape 6 peut avoir été enregistré.

---

## 5. Ce qui casse si on touche à quoi (synthèse des handoffs)

- **Enregistrer dans le Content-Type Builder** : Strapi redémarre en pleine démo, le schéma ne correspond
  plus à `apps/backend/data/demo-export.tar` (le reset passe en seed, plus lent). À ne jamais faire en direct.
- **`DEMO_MODE`** doit valoir exactement `true` dans `apps/backend/.env` : sinon le cron passe à 5 minutes et l'étape 5
  ne marche plus. Tout changement impose de redémarrer Strapi.
- **`WEBHOOK_SECRET`** identique dans `apps/backend/.env` et `apps/frontend/.env` : sinon 401 à chaque publication, T2 affiche
  « refusé ... (401) » et la page ne bouge plus. Ne rien saisir dans « En-têtes » du webhook dans l'admin.
- **Front en `next dev`** (`demo:start:dev`) : rien n'est mis en cache, la page paraît à jour même sans
  webhook, la démo de l'étape 4 ne prouve plus rien. Rester sur `npm run demo:start` (production).
- **Front ouvert par une IP** : le cookie d'aperçu est refusé. Toujours `localhost`.
- **Plugin non compilé** (`dist/` absent) : `Could not find Custom Field`, Strapi ne démarre pas. `npm run
  demo:start`, `npm run dev` (tâche turbo `backend#plugin:build`), `npm run demo:reset` (`predemo:reset`) et
  `npm install` (`postinstall`) le recompilent ; ne jamais lancer `npm install` dans
  `apps/backend/src/plugins/editorial-toolkit` (un second `@strapi/strapi` casserait l'admin).
- **`npm install` ailleurs qu'à la racine** (dans `apps/backend` ou `apps/frontend`) : crée un second
  `node_modules` et un second lockfile, et peut mélanger React 18 (admin Strapi) et React 19 (front).
  Toujours `npm install` à la racine (voir `docs/handoff/socle.md`, section « Monorepo Turborepo »).
- **Login admin** : 5 par 5 minutes. Un 429 impose d'attendre 5 minutes ou de redémarrer Strapi.
- **Jetons MCP** : tools recalculés à chaque requête selon les permissions ; renommer un jeton dans l'admin
  en recrée un au redémarrage ; `update_article` exige `data.title`. Le jeton lecture seule ne voit pas
  `publish_article`.
- **`publishAt` passé sur un brouillon enregistré** : le cron le publie dans les 30 s (étape 6 : ne pas enregistrer).
- **Rejouer sans reset** : doublons de slug (MCP), citation en double, compteurs du plugin décalés.
- **Port 1337 ou 3000 occupé** par un autre projet : `demo:reset` refuse, `demo:start` échoue. Vérifier
  avec `lsof -i tcp:1337 -i tcp:3000` avant 18h00.
- **Tiret cadratin** : `demo:check` échoue s'il en trouve un dans le dépôt (les réponses de l'agent ne sont
  pas dans le dépôt, mais le prompt demande de n'en pas produire).

---

## 6. Captures à mettre dans le deck (slides filets)

À faire après une répétition complète, admin en thème clair, zoom de la démo :

1. **Slide 12** : Content-Type Builder, Article, avec la zone dynamique `blocks` (Texte riche, Citation, Galerie) et le composant `seo`.
2. **Slide 13** : écran d'édition de « Composer un article bloc par bloc » avec les 4 blocs, dont la citation « Publier, c'est déjà relire. » (Hugo Lambert).
3. **Slide 14** : page du front `/articles/composer-un-article-bloc-par-bloc` avec la citation, et à côté la réponse JSON de `curl` (bloc `blocks.quote`).
4. **Slide 15** : schéma « Publier > webhook signé > /api/revalidate > revalidateTag(articles, article:slug) » et la ligne de log T2.
5. **Slide 16** : T3 avec `Publié : « Parution programmée en direct (HH:MM:SS) » (fr)` et la liste du front où l'article apparaît.
6. **Slide 17** : tableau de bord « Boîte à outils éditoriale » et panneau CHECK-LIST DE PUBLICATION (4/6 puis 5/6), carte « Ton éditorial » dans l'onglet Personnalisé.
6 bis. **Slide 17 bis** : le tableau « Injection zones vs. Content Manager APIs » de la doc (copie, sans la
   retoucher), et deux captures mode révélateur activé : liste Article avec l'étiquette `listView.actions` près
   des filtres, édition de « Brouillon : écrire son propre plugin » avec `editView.right-links` sous les boutons
   et la CHECK-LIST DE PUBLICATION juste dessous. Faire ces captures en thème clair, puis désactiver l'interrupteur.
7. **Slide 18** : T5 avec la réponse de l'agent, et le Content Manager avec « Strapi et l'IA : un brouillon écrit par Claude » en Brouillon.
