# Créer le webhook de revalidation dans l'admin Strapi

> **Rappel : rien à faire en temps normal.** Le bootstrap du SOCLE (`src/index.ts`, fonction `ensureWebhook`)
> crée ou réaligne à chaque démarrage le webhook **« Revalidation front Next.js »** vers
> `FRONTEND_URL/api/revalidate`, abonné à `entry.publish` et `entry.unpublish`. Cette procédure sert
> à le montrer en direct pendant le talk, ou à le recréer à la main si quelqu'un l'a supprimé
> (dans ce cas, un simple redémarrage de Strapi le recrée aussi).

Libellés relevés dans les traductions françaises de `@strapi/admin` 5.54.0
(`node_modules/@strapi/admin/dist/admin/admin/src/translations/fr.json.mjs`), fautes d'origine comprises.

## Étapes

1. Se connecter à `http://localhost:1337/admin` avec l'admin de démo (`admin@example.com`).
2. Menu de gauche : **Paramètres** (`global.settings`).
3. Section **Paramètre Globaux** (`Settings.global`, libellé tel quel dans Strapi), entrée **Webhooks**
   (`Settings.webhooks.title`). Sous-titre de la page : « Recevoir des notifications de modifications en POST ».
4. Bouton **Créer un nouveau webhook** (`Settings.webhooks.list.button.add`).
5. Remplir le formulaire :
   - **Nom** (`global.name`) : `Revalidation front Next.js`. Le nom doit commencer par une lettre et ne contenir
     que lettres, chiffres, espaces et underscores : pas de deux-points ni de tiret.
   - **Url** (`Settings.webhooks.form.url`) : `http://localhost:3000/api/revalidate`.
   - **En-têtes** (`Settings.webhooks.form.headers`) : **laisser vide**. Le header `Authorization` vient de
     `webhooks.defaultHeaders` dans `config/server.ts` (voir la config request WEBHOOKS), le secret reste donc
     hors de la base. Un en-tête saisi ici avec la même clé écraserait celui par défaut.
   - **Evénements** (`Settings.webhooks.form.events`) : sur la ligne **Entry**, cocher uniquement **Publier**
     (`app.utils.publish`) et **Annuler la publication** (`app.utils.unpublish`). Infobulle affichée :
     « Cet événement n'existe que pour les contenus avec le système Brouillon/Publier activé ».
     Ne pas cocher **Créer**, **Mettre à jour**, **Supprimer** : la route les ignorerait de toute façon
     (réponse 200, log « ignoré »), mais cela ajoute du bruit dans les logs.
6. Cliquer sur **Enregistrer** (`global.save`). Notification : « Webhook créé ».
7. Facultatif : bouton **Déclencheur** (`Settings.webhooks.trigger`) pour envoyer un événement de test
   `trigger-test`. La route répond 200 et logue
   `[webhook] trigger-test -> ignoré (...)`, ce qui prouve que le secret passe.

## Vérifier

- Publier un article dans le Content Manager, puis regarder le terminal du front :
  `[webhook] entry.publish article "<titre>" (fr) -> tags revalidés : articles, article:<slug>`.
- Si le log affiche `refusé : header Authorization absent ou secret invalide (401)`, c'est que
  `webhooks.defaultHeaders` n'est pas en place ou que `WEBHOOK_SECRET` diffère entre `.env` et `frontend/.env`.
