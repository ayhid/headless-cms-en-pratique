# Config request : FRONT

## 1. config/admin.ts
- Pourquoi : activer la fonctionnalité Preview de Strapi 5 pour que le bouton « Aperçu » du Content Manager
  ouvre le front Next.js en Draft Mode, sur la bonne locale et le bon slug (doc : https://docs.strapi.io/cms/features/preview.md).
- Changement exact : remplacer la ligne commentée `// [config request FRONT] preview: ...` par le bloc suivant (à coller tel quel) :
```ts
  // Bouton "Aperçu" du Content Manager : ouvre le front Next.js en mode brouillon (Draft Mode)
  // via FRONTEND_URL/api/preview?secret=...&slug=...&locale=...&status=draft|published
  preview: {
    enabled: env.bool('PREVIEW_ENABLED', true),
    config: {
      // Origine autorisee a etre affichee dans l'iframe de l'admin (CSP frame-src)
      allowedOrigins: [env('FRONTEND_URL', 'http://localhost:3000')],
      async handler(uid, { documentId, locale, status }) {
        // Seuls les articles ont une page sur le front ; null = pas de bouton Apercu
        if (uid !== 'api::article.article') return null;
        const document =
          (await strapi.documents('api::article.article').findOne({ documentId, locale, status: status === 'published' ? 'published' : 'draft' })) ??
          (await strapi.documents('api::article.article').findOne({ documentId, locale, status: 'draft' }));
        if (!document?.slug) return null;
        const params = new URLSearchParams({
          secret: env('PREVIEW_SECRET', ''),
          slug: document.slug,
          locale: locale ?? 'fr',
          status: status ?? 'draft',
        });
        return `${env('FRONTEND_URL', 'http://localhost:3000')}/api/preview?${params}`;
      },
    },
  },
```
- Variables d'environnement nouvelles :
  - `PREVIEW_ENABLED=true` (optionnelle, défaut `true`) : commentaire pour `.env.example` :
    `# Active le bouton Apercu du Content Manager (preview Strapi vers le front Next.js)`
  - Aucune autre : `FRONTEND_URL` et `PREVIEW_SECRET` existent déjà (racine) ; `PREVIEW_SECRET` doit rester
    identique dans `.env` et `frontend/.env`.
- Dépendances npm : aucune.
- `npx tsc --noEmit` à la racine passe avec ce bloc (le global `strapi` est typé par `@strapi/types`).
- Comment vérifier après application (Strapi redémarré, front lancé) :
```bash
source .env
JWT=$(curl -s -X POST http://localhost:1337/admin/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEMO_ADMIN_EMAIL\",\"password\":\"$DEMO_ADMIN_PASSWORD\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["token"])')
DOC=$(curl -s -g "http://localhost:1337/api/articles?locale=fr&status=draft&filters[slug][\$eq]=brouillon-plugin-maison" \
  -H "Authorization: Bearer $STRAPI_PREVIEW_TOKEN" | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"][0]["documentId"])')
curl -s "http://localhost:1337/content-manager/preview/url/api::article.article?documentId=$DOC&locale=fr&status=draft" -H "Authorization: Bearer $JWT"
# attendu : {"data":{"url":"http://localhost:3000/api/preview?secret=...&slug=brouillon-plugin-maison&locale=fr&status=draft"}}
curl -s -D - -o /dev/null http://localhost:1337/admin | grep -i content-security   # contient "frame-src http://localhost:3000"
```
  Puis dans l'admin : Content Manager > Article > « Brouillon : ecrire son propre plugin » > bouton « Aperçu » :
  l'iframe affiche le brouillon avec le bandeau jaune « Mode aperçu : brouillon ».

Résultats mesurés en phase 2 (Strapi 1343, front 3006, bloc appliqué localement puis retiré avant commit) :
```
== preview url status=draft
{"data":{"url":"http://localhost:3006/api/preview?secret=<PREVIEW_SECRET>&slug=brouillon-plugin-maison&locale=fr&status=draft"}}
== preview url status=published
{"data":{"url":"http://localhost:3006/api/preview?secret=<PREVIEW_SECRET>&slug=brouillon-plugin-maison&locale=fr&status=published"}}
== preview url article publie en
{"data":{"url":"http://localhost:3006/api/preview?secret=<PREVIEW_SECRET>&slug=why-a-headless-cms&locale=en&status=draft"}}
== preview url author (attendu : pas d'apercu)
 204
== suivre l'URL generee par Strapi
final 200 http://localhost:3006/articles/brouillon-plugin-maison   (bandeau "Mode aperçu : brouillon" present)
== CSP admin frame-src
Content-Security-Policy: frame-src http://localhost:3006
```

## 2. frontend/next.config.ts (information, aucun changement demandé)
`images.remotePatterns` n'est pas utilisé : le front affiche les images Strapi avec `<img>` (URL absolue construite
depuis `STRAPI_URL`), ce qui marche quel que soit le port de Strapi. Rien à changer.
