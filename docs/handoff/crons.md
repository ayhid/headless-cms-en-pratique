# Handoff CRONS (phase 2)

Deux tâches cron Strapi, au format objet `{ task, options: { rule, tz } }` de la doc
(https://docs.strapi.io/cms/configurations/cron), tout en Document Service (ni SQL ni Query Engine).

| Fichier | Rôle |
|---|---|
| `config/cron-tasks.ts` | Déclaration des 2 tâches et des règles (mode démo / réaliste) |
| `src/crons/publish-scheduled.ts` | Publication programmée |
| `src/crons/drafts-digest.ts` | Récapitulatif des brouillons en attente |
| `src/crons/log.ts` | Console + `logs/crons.log`, dates en français (Europe/Paris), liste des locales |
| `scripts/crons/schedule-demo-article.ts` | Prépare le brouillon programmé du talk en une commande |
| `scripts/checks/crons.ts` | 3 contrôles pour `demo:check` |
| `docs/handoff/config-requests/crons.md` | `cron: { enabled: true, tasks: cronTasks }` dans `config/server.ts` |

**À appliquer par le SOCLE** : la config request (un import + 4 lignes dans `config/server.ts`).
Rien à changer dans `.gitignore` (`logs` et `*.log` y sont déjà) ni dans `.env.example` (`DEMO_MODE` y est).

## Ce qui marche (vérifié sur le port 1340)

- **Publication programmée** (`publishScheduledArticles`) : pour chaque locale (fr d'abord, locale par défaut),
  `strapi.documents('api::article.article').findMany({ locale, status: 'draft', publicationFilter: 'never-published',
  filters: { publishAt: { $notNull: true, $lte: now } } })`, puis `.publish({ documentId, locale })` pour chacun.
  Idempotente : une locale publiée n'est plus `never-published`, le passage suivant écrit
  `Aucun article programmé à publier.` Verrou en mémoire pour ne jamais chevaucher deux passages.
  `publishAt` n'est pas localisé (SOCLE) : un article fr + en programmé est publié dans les deux locales.
- **Choix assumé** : seuls les brouillons **jamais publiés** dans la locale sont publiés. Un article déjà publié
  puis modifié (`modified`) n'est PAS republié automatiquement, même avec un `publishAt` passé
  (sinon chaque retouche d'un article en ligne partirait en production au passage suivant). Vérifié :
  « Pourquoi un CMS headless ? » modifié après publication reste en `modified` et apparaît dans le récapitulatif.
- **Récapitulatif** (`draftsDigest`) : par locale, brouillons `never-published` puis `modified`
  (`publicationFilter`), avec titre, auteur (relation peuplée), date prévue de parution et état.
  Écrit dans la console et dans `logs/crons.log` (fichier ignoré par git et par le watcher de `strapi develop`).
- **Mode démo** (`DEMO_MODE=true`) : publication toutes les 30 s (`*/30 * * * * *`), récapitulatif toutes les
  minutes à la seconde 15 (`15 * * * * *`, décalé pour ne jamais s'entremêler avec la publication).
  Sinon : toutes les 5 min (`0 */5 * * * *`) et tous les jours à 8 h (`0 0 8 * * *`), `tz: 'Europe/Paris'`.
  Règles vérifiées avec le moteur réel (croner 10.0.1) : prochaines exécutions 11:16:00 / 11:16:30,
  11:16:15 / 11:17:15, 11:20:00 / 11:25:00, 24/09 08:00 / 25/09 08:00.
- **Webhook enchaîné** : `.publish()` du Document Service émet `entry.publish`, donc le webhook
  « Revalidation front Next.js » part tout seul à chaque publication par le cron (lien direct avec la section
  webhooks du talk : le cron publie, le webhook revalide le front). Vérifié avec un serveur d'écoute
  temporaire sur 3013 (`FRONTEND_URL=http://localhost:3013`), voir les sorties réelles plus bas.
- **Scénario live vérifié** : brouillon fr créé via l'API admin du Content Manager avec `publishAt = maintenant + 20 s`,
  publié par le cron sans intervention, renvoyé par `GET /api/articles?locale=fr` (token lecture seule).
- **`demo:check`** : 11/11 vert avec le cron activé ; message clair si le cron n'est pas encore activé.

## Démo en 60 secondes

Prérequis : config request appliquée, `DEMO_MODE=true` dans `.env`, `npm run demo:start` lancé,
`tail -f logs/crons.log` projeté dans un terminal.

```bash
npx tsx scripts/crons/schedule-demo-article.ts        # publishAt = maintenant + 20 s (argument : autre délai en s)
```

1. Le script affiche `Brouillon fr créé : « Parution programmée en direct (HH:MM:SS) »` : le montrer dans
   le Content Manager, statut Brouillon, champ `publishAt` rempli (10 s).
2. À la seconde 15 de la minute, le récapitulatif le liste dans `logs/crons.log` (jamais publié, parution prévue).
3. Au passage suivant du cron après l'heure prévue (au plus 30 s de latence), `logs/crons.log` affiche
   `Publié : « Parution programmée en direct ... » (fr)` et le script termine par
   `Publié ! GET /api/articles?locale=fr le renvoie`. Rafraîchir le Content Manager : Publié.
4. Enchaîner sur les webhooks : cette publication a déclenché `entry.publish`, le front est revalidé.

`--no-wait` crée seulement le brouillon. Le script lit `.env` (`PORT`, `DEMO_ADMIN_*`, `STRAPI_READ_TOKEN`) ;
en phase 2 : `PORT=1340 npx tsx scripts/crons/schedule-demo-article.ts`. Il réutilise une image de la
médiathèque comme cover (sinon le contrôle SOCLE « API fr : ... avec cover » passe au rouge) et le premier auteur.

**Attention au seed** : l'article `publication-programmee` (fr + en, `publishAt` passé) est publié au
**premier passage du cron après le démarrage**, soit dans les 30 s suivant `demo:start` : on ne peut donc pas
le montrer brouillon en direct. Pour la démo, utiliser le script ci-dessus, prévu pour ça.
Après `demo:reset`, il redevient brouillon jusqu'au démarrage suivant.

## Ce qui casse si on touche à quoi

- **`cron.enabled` absent ou `false`** dans `config/server.ts` : aucune tâche ne tourne, `demo:check`
  affiche « Cron pas encore activé ... » et « logs/crons.log absent ».
- **`DEMO_MODE`** : lu au chargement de la config (`process.env.DEMO_MODE === 'true'`, strictement `true`).
  Le changer impose un redémarrage de Strapi. `DEMO_MODE=false` le jour J = publication toutes les 5 min et
  récapitulatif à 8 h seulement : la démo live ne marche plus. `demo:check` adapte son seuil de fraîcheur
  du log (90 s en démo, 6 min sinon).
- **Fuseau** : les règles et l'affichage sont en `Europe/Paris` (`TIMEZONE` dans `src/crons/log.ts`).
  `publishAt` est stocké en UTC et comparé à `new Date()` : le fuseau n'influe pas sur la décision de publier,
  seulement sur l'heure à laquelle tombe le récapitulatif de 8 h et sur les heures affichées.
  Changer `tz` pour une valeur invalide : Strapi log `Could not schedule cron job ... invalid schedule` et la tâche
  n'est pas planifiée.
- **Redémarrage** : aucun état persistant, les tâches repartent au démarrage. Un article dont l'heure est passée
  pendant l'arrêt est publié au premier passage suivant (vérifié : le seed est publié 15 s après le démarrage ;
  un redémarrage sur base déjà publiée écrit juste « Aucun article programmé à publier. »).
  `demo:reset` (strapi import) ne déclenche pas les crons.
- **Renommer `publishAt`** ou le rendre localisé : adapter le filtre de `publish-scheduled.ts`, le script et le check.
- **Renommer les clés `publishScheduledArticles` / `draftsDigest`** : le check les cherche dans `config/cron-tasks.ts`.
- **Désactiver Draft & Publish sur article** : `publicationFilter` n'a plus d'effet, les tâches n'ont plus de sens.
- **Latence** : un article est publié au passage du cron qui suit son `publishAt` (0 à 30 s en démo, 0 à 5 min
  sinon), jamais pile à l'heure.

## Écarts avec la doc constatés

- La page cron indique « powered by node-schedule » ; Strapi 5.54.0 utilise en réalité **croner 10**
  (`node_modules/@strapi/core/dist/services/cron.js`, qui convertit `rule` / `tz` / `start` / `end` en options croner).
  Le format objet de la doc fonctionne tel quel.
- Aucune API publique pour lister les tâches depuis l'extérieur du processus : le check vérifie donc la
  configuration (fichiers) + la fraîcheur de `logs/crons.log` (la publication écrit une ligne à chaque passage).

## Sorties réelles (23/09/2026, port 1340, DEMO_MODE=true, après `demo:reset`)

Script :

```
[demo cron 11:14:16] Brouillon fr créé : « Parution programmée en direct (11:14:36) » (documentId dj35c50wgql4p34fopy5yssv), statut : brouillon
[demo cron 11:14:16] Parution prévue à 11:14:36, auteur : Camille Verdier
[demo cron 11:14:16] Attente de la publication par le cron (aucune action manuelle)...
[demo cron 11:15:00] Publié ! GET /api/articles?locale=fr le renvoie (publishedAt 2026-09-23T09:15:00.014Z)
```

Log Strapi :

```
[2026-09-23 11:14:15.609] info: ================================================================
[2026-09-23 11:14:15.609] info: Récapitulatif des brouillons en attente
[2026-09-23 11:14:15.609] info: Généré le mercredi 23 septembre 2026 à 11:14:15 (heure de Paris)
[2026-09-23 11:14:15.609] info: ================================================================
[2026-09-23 11:14:15.609] info: Locale fr : 2 brouillon(s) en attente
[2026-09-23 11:14:15.609] info:   - « Brouillon : ecrire son propre plugin »
[2026-09-23 11:14:15.609] info:       auteur : Ines Carvalho | parution prévue : non programmée | jamais publié
[2026-09-23 11:14:15.609] info:   - « Publication programmee par un cron »
[2026-09-23 11:14:15.609] info:       auteur : Camille Verdier | parution prévue : mercredi 23 septembre 2026 à 09:42:31 | jamais publié
[2026-09-23 11:14:15.609] info: Locale en : 1 brouillon(s) en attente
[2026-09-23 11:14:15.609] info:   - « Publication scheduled by a cron »
[2026-09-23 11:14:15.609] info:       auteur : Camille Verdier | parution prévue : mercredi 23 septembre 2026 à 09:42:31 | jamais publié
[2026-09-23 11:14:15.609] info: Total : 3 brouillon(s) en attente
[2026-09-23 11:14:15.609] info: ================================================================
[2026-09-23 11:14:15.620] info: Strapi started successfully
[2026-09-23 11:14:16.255] http: POST /content-manager/collection-types/api::article.article (17 ms) 201
[2026-09-23 11:14:30.054] info: [cron publication 11:14:30] Publié : « Publication programmee par un cron » (fr), prévu le mercredi 23 septembre 2026 à 09:42:31
[2026-09-23 11:14:30.055] info: [cron publication 11:14:30] Publié : « Publication scheduled by a cron » (en), prévu le mercredi 23 septembre 2026 à 09:42:31
[2026-09-23 11:14:30.055] info: [cron publication 11:14:30] 2 publication(s) programmée(s) effectuée(s).
[2026-09-23 11:15:00.030] info: [cron publication 11:15:00] Publié : « Parution programmée en direct (11:14:36) » (fr), prévu le mercredi 23 septembre 2026 à 11:14:36
[2026-09-23 11:15:00.031] info: [cron publication 11:15:00] 1 publication(s) programmée(s) effectuée(s).
[2026-09-23 11:15:30.005] info: [cron publication 11:15:30] Aucun article programmé à publier.
```

Webhooks reçus par le serveur d'écoute temporaire (port 3013) :

```
2026-09-23T09:14:30.058Z POST /api/revalidate event=entry.publish model=article locale=fr title="Publication programmee par un cron" publishedAt=2026-09-23T09:14:30.020Z
2026-09-23T09:14:30.059Z POST /api/revalidate event=entry.publish model=article locale=en title="Publication scheduled by a cron" publishedAt=2026-09-23T09:14:30.046Z
2026-09-23T09:15:00.032Z POST /api/revalidate event=entry.publish model=article locale=fr title="Parution programmée en direct (11:14:36)" publishedAt=2026-09-23T09:15:00.014Z
```

(Aucun header `Authorization` reçu : normal tant que la config request WEBHOOKS `defaultHeaders` n'est pas appliquée.)

`PORT=1340 FRONT_PORT=3013 npm run demo:check` (cron activé) :

```
== CRONS
  [OK] Cron activé, tâches déclarées : publishScheduledArticles, draftsDigest (mode démo : 30 s et 1 min)
  [OK] logs/crons.log écrit il y a 8 s (maximum attendu : 90 s)
  [OK] Aucun brouillon en retard : tout article dont publishAt est passé est publié
...
Tout est vert : 11/11 OK
```

Avant intégration (`config/server.ts` du SOCLE, cron non activé) :

```
== CRONS
  [KO] Cron pas encore activé : ajouter cron: { enabled: true, tasks: cronTasks } dans config/server.ts (voir docs/handoff/config-requests/crons.md)
  [KO] logs/crons.log absent (normal tant que le cron n'est pas activé)
  [OK] Aucun brouillon en retard : tout article dont publishAt est passé est publié
```

(Sortie prise sur une base où le cron avait déjà tourné. Sur une base neuve issue de `demo:reset` sans cron
activé, le 3e contrôle est KO aussi et nomme « Publication programmee par un cron » (fr) et (en) :
c'est exactement ce que le cron doit corriger.)
