# Handoff RUNBOOK (phase 3)

Livrable : `DEMO.md` à la racine (checklist J-30 min, séquence minutée de 7:00, plans B par étape avec
slide filet, sortie réelle de `demo:check`, synthèse « ce qui casse »).

## Ce qui marche (répétition à blanc du 23/09, 11h58 à 12h03, Strapi 1337, front 3000 en production)

Joué en suivant DEMO.md, gestes « clic » rejoués par l'API du Content Manager avec **un seul jeton admin**
(celui que `demo:check` garde dans `.tmp/demo-check-admin-jwt-1337`, aucun login supplémentaire) :

| Étape | Résultat mesuré |
|---|---|
| `npm run demo:reset` | 4,9 s puis 5,2 s (import 2,3 à 2,5 s) |
| `npm run demo:start 2>&1 \| tee logs/demo-start.log` | Strapi et front prêts 7 s après le lancement ; aucun redémarrage de Strapi dû au fichier de log ; aucune ligne `secret=` |
| Premier passage du cron | 11:59:30, 33 s après le lancement ; `demo:check` : 31/31 |
| Composer (citation Hugo Lambert, PUT sans `status`) | HTTP 200 en 0,02 s, statut « modified », front inchangé |
| Publier | HTTP 200, ligne `[webhook] entry.publish ... composer-un-article-bloc-par-bloc` ; citation visible sur le front 0,12 s après, au premier rechargement |
| Cron (`schedule-demo-article.ts 75` à 11:59:58) | publishAt 12:01:13, publié 12:01:30 (latence 17 s), webhook reçu, article dans la liste du front |
| MCP (`claude -p` + prompt exact de DEMO.md, config temporaire, `--strict-mcp-config`) | 10 s et 11 s ; réponse en 3 lignes, sans tableau, sans tiret cadratin ; brouillon `draft` créé par Camille ; 2e essai = doublon de slug confirmé (total 2) |
| Plans B | `webhooks:simulate` 0,3 s (3/3), `mcp-curl.sh` 0,3 s (7 étapes OK), curl de l'API publique : bloc `blocks.quote` Hugo Lambert présent |
| DocumentId de « Composer un article bloc par bloc » | `pjmu3k3t4okswmnvjmwp2683`, identique après deux `demo:reset` (URL directe de l'onglet 3) |

Fin : `npm run demo:reset`, seuls mes processus arrêtés (PID de `lsof -ti tcp:1337` et `tcp:3000`),
ports 1337 et 3000 libres, `logs/demo-start.log` supprimé. Aucune config globale de Claude Code modifiée.

## Démo en 60 s

```bash
npm run demo:reset && npm run demo:start 2>&1 | tee logs/demo-start.log   # T1, non projeté
tail -n 0 -f logs/demo-start.log | grep --line-buffered '\[webhook\]'       # T2
tail -n 5 -f logs/crons.log                                                # T3
npm run demo:check                                                         # T4, 30 s après demo:start : 31/31
```

Puis DEMO.md section 2 : modéliser, composer, lire, publier (lancer `schedule-demo-article.ts 75` à 2:45),
cron (publication entre 4:00 et 4:30), plugin, MCP.

## Ce qui casse si on touche à quoi

Voir DEMO.md section 5. Points propres au runbook :
- Le minutage du cron repose sur `75` lancé à 2:45 : changer l'ordre des étapes impose de recalculer
  (publication entre lancement + délai et lancement + délai + 30 s).
- L'onglet 3 utilise un documentId fixe venant de `data/demo-export.tar` : régénérer l'export le change,
  mettre alors à jour l'URL dans DEMO.md.
- Le terminal T2 dépend de `tee logs/demo-start.log` ; sans `tee`, T2 reste vide.

## Gestes à répéter à l'œil (non joués : clics dans l'admin)

Content-Type Builder (étape 1, dont l'onglet Personnalisé) ; ajout de la citation et Enregistrer dans
l'écran d'édition (étape 2) ; page Webhooks et bouton Publier (étape 4) ; liste du Content Manager
avec le brouillon programmé (étape 5) ; tableau de bord du plugin, Ouvrir, pastille Pédagogique
(étape 6) ; Claude Code en mode interactif (confiance du dossier, `/mcp`) et rechargement du Content
Manager (étape 7) ; prompt bonus `editorial_checklist` avec Claude Code ; thème clair (Profil >
Expérience > Mode d'interface) ; zoom et colonne de droite du Content Manager au projecteur.

## À corriger (hors de mon périmètre, rien n'a été modifié)

1. **Wifi et MCP** : la consigne « tout est local, on peut couper le wifi » est fausse pour l'étape MCP,
   Claude Code appelle le modèle sur Internet. DEMO.md le signale et propose `mcp-curl.sh` (local) en repli.
2. Corrigé : `scripts/checks/front.ts` : libellés sans accents (« publie(s) affiche(s) », « Detail », « Apercu »),
   visibles dans la sortie de `demo:check` collée dans DEMO.md.
3. Corrigé (demo:reset les supprime) : `strapi import` laisse un fichier `import_<horodatage>.log` à la racine à chaque `demo:reset`
   (12 fichiers constatés, ignorés par git) : `demo-reset.ts` pourrait les supprimer ou les ranger dans `logs/`.
4. Corrigé (demo:reset le supprime) : `logs/crons.log` n'était jamais vidé par `demo:reset` : le fichier grossit d'une répétition à l'autre
   (sans effet sur la démo, T3 n'affiche que la fin).
5. Le tableau de bord du plugin compte aussi les brouillons MCP créés par `mcp-curl.sh` et par l'agent
   (« Brouillon créé en JSON-RPC » à 0/6) : sans effet si on reset entre deux répétitions.
6. Le handoff FRONT et le handoff CONTENU citent encore des titres sans accents (« Brouillon : ecrire son
   propre plugin ») ; l'admin affiche désormais « Brouillon : écrire son propre plugin », repris dans DEMO.md.
