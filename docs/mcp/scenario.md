# Scénario de démo MCP (environ 90 secondes)

But : montrer qu'un agent IA pilote Strapi par le serveur MCP natif, dans les limites de son Admin token.
Répété réellement le 23/09/2026 avec `claude -p` (Claude Code 2.1.280) sur l'instance de répétition
(port 1338). Le jour J, remplacer 1338 par 1337.

## Pré-requis

- `mcp: { enabled: true }` dans `apps/backend/config/server.ts` et les deux Admin tokens dans `.env`
  (voir `docs/handoff/config-requests/mcp.md`), puis `npm run demo:reset` et `npm run demo:start`.
- `npm run demo:check` : section MCP entièrement verte.
- Dans le terminal de démo : `set -a; . apps/backend/.env; set +a` (exporte les tokens).
- Admin ouvert sur Content Manager, Article, locale fr.

## Configuration du client (rien dans la config globale)

`.mcp.json.example` à la racine (transport http, `Authorization: Bearer ${STRAPI_MCP_ADMIN_TOKEN}`,
Claude Code remplace `${...}` par la variable d'environnement). Pour la démo, on le passe explicitement :

```bash
claude --mcp-config .mcp.json.example --strict-mcp-config
```

`--strict-mcp-config` ignore les autres serveurs MCP de l'utilisateur ; les tools s'appellent alors
`mcp__strapi__list_article`, `mcp__strapi__create_article`, etc. Dans la session, `/mcp` doit afficher
`strapi` connecté.

Commande de la documentation Strapi (inscrit le serveur dans la config locale de Claude Code, à éviter
sur la machine de démo si on ne veut rien laisser derrière soi) :

```bash
claude mcp add strapi-mcp --transport http http://localhost:1337/mcp -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Commande de test non interactive :

```bash
claude -p "Liste les outils du serveur MCP strapi." --mcp-config .mcp.json.example --strict-mcp-config --allowedTools "mcp__strapi__*"
```

Vérifié avec une copie de `.mcp.json.example` pointant sur 1338 : l'agent liste les 9 outils
(8 pour article et `log`) et signale de lui-même que `update_article` exige `title` dans `data`.

## Étape 1 : lister, créer un brouillon en fr, le mettre à jour (token complet)

Prompt dit ou collé :

> Utilise uniquement le serveur MCP strapi. 1) Liste les types de contenu que tu peux gérer et les outils
> disponibles pour chacun. 2) Crée un brouillon d'article en français (locale fr) avec le titre « Strapi et
> l'IA : un brouillon écrit par Claude », le slug « strapi-ia-brouillon-claude » et le résumé « Premier jet
> rédigé par un agent via le serveur MCP de Strapi. ». 3) Mets à jour ce brouillon pour remplacer le résumé
> par « Brouillon créé puis relu par un agent IA, en attente de validation humaine. ». Ne publie rien.
> Termine par le documentId et le statut de l'article, en français, en quelques lignes.

Commande de répétition :

```bash
claude -p "<prompt ci-dessus>" --mcp-config <json pointant sur :1338> --strict-mcp-config --allowedTools "mcp__strapi__*"
```

Sortie réelle de l'agent :

```
**1) Ce que le serveur MCP strapi me permet de gérer**

Il n'expose qu'un seul type de contenu : **Article** (`api::article.article`, locales `fr` et `en`). Les outils disponibles pour lui sont :
- `list_article` : lister avec filtres, tri et pagination
- `get_article` : lire un article
- `create_article` : créer
- `update_article` : modifier
- `delete_article` : supprimer
- `publish_article` et `unpublish_article` : publier et dépublier
- `discard_article_draft` : abandonner un brouillon

Un outil `log` écrit aussi dans les logs Strapi, mais il n'est lié à aucun type de contenu. Les auteurs et les catégories ne sont pas gérables directement : on peut seulement les rattacher à un article par leur documentId.

**2 et 3) Résultat**

J'ai créé le brouillon en locale `fr` avec le titre et le slug demandés, puis j'ai remplacé son résumé. Il contient maintenant « Brouillon créé puis relu par un agent IA, en attente de validation humaine. ». Rien n'a été publié.

- **documentId** : `a9v90okxk0e77tzkzuj994us`
- **Statut** : `draft` (brouillon), `publishedAt` vide
```

Durée observée : environ une minute.

## Étape 2 : le voir dans le Content Manager

Rafraîchir la liste Article (fr) : l'article apparaît en **Brouillon**, créé par Camille Demo (le
propriétaire du token). Preuve par l'API du Content Manager avec le JWT admin (sortie réelle) :

```
GET /content-manager/collection-types/api::article.article?locale=fr&filters[$and][0][slug][$eq]=strapi-ia-brouillon-claude -> HTTP 200, total 1
{
 "documentId": "a9v90okxk0e77tzkzuj994us",
 "locale": "fr",
 "title": "Strapi et l'IA : un brouillon écrit par Claude",
 "slug": "strapi-ia-brouillon-claude",
 "excerpt": "Brouillon créé puis relu par un agent IA, en attente de validation humaine.",
 "status": "draft",
 "publishedAt": null,
 "createdBy": "Camille Demo"
}
```

## Étape 3 : le token en lecture seule ne peut pas publier

Même configuration, mais `STRAPI_MCP_ADMIN_TOKEN` pointe sur la valeur du token lecture seule
(dans le terminal : `STRAPI_MCP_ADMIN_TOKEN=$STRAPI_MCP_READONLY_TOKEN claude ...`).

> Utilise uniquement le serveur MCP strapi. Publie l'article en français dont le documentId est
> a9v90okxk0e77tzkzuj994us. Si tu ne peux pas, explique pourquoi en deux phrases, en français.

Sortie réelle de l'agent :

```
Je n'ai pas pu publier l'article, qui reste en brouillon (« Strapi et l'IA : un brouillon écrit par Claude », `publishedAt: null`), car le serveur MCP strapi ne propose que la lecture et la journalisation : `get_article`, `list_article` et `log`. Aucun outil ne permet de publier ou de modifier un document, donc un humain doit valider et publier l'article depuis l'admin Strapi, ce que suggère d'ailleurs son extrait (« en attente de validation humaine »).
```

Vérifié ensuite dans le Content Manager : `status: draft`, `publishedAt: null`.

Message à faire passer : le token ne se contente pas de refuser l'appel, le tool n'existe même pas pour
l'agent (`tools/list` filtré par les permissions). Si on force l'appel en JSON-RPC :
`{"code":-32602,"message":"Tool publish_article disabled"}`.

## Plan B (pas de réseau pour le modèle, ou agent trop lent)

```bash
bash docs/mcp/mcp-curl.sh
```

Rejoue les mêmes étapes en JSON-RPC avec curl : rejet du token Content API (401), tools du token complet,
création d'un brouillon fr, mise à jour, tools du token lecture seule, refus de `publish_article`,
statut `draft` dans le Content Manager. Testé sur le port 1338 (sortie dans `docs/handoff/mcp.md`).

## Après la démo

L'article créé reste en base jusqu'au prochain `npm run demo:reset`. Rejouer la démo sans reset crée un
second brouillon avec le même slug : c'est accepté en brouillon (vérifié, aucune erreur à la création),
ce qui sèmerait la confusion dans la liste. Faire un reset, ou changer le slug dans le prompt.

## À savoir sur ce que l'agent affiche

Le texte de l'agent n'est pas sous notre contrôle. Au test « Liste les outils du serveur MCP strapi. »,
Claude a répondu par un tableau contenant un tiret cadratin dans une case vide. Les prompts ci-dessus
demandent une réponse courte en français, sans tableau, ce qui a suffi aux répétitions. Pour verrouiller,
ajouter au prompt : « Réponds sans tableau et sans tiret cadratin. »
