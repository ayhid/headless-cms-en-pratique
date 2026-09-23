import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  // strapi develop ne redemarre pas quand on modifie les scripts de demo, l'export, la doc, ni quand
  // turbo ecrit dans .turbo/ (le front est hors de apps/backend depuis le passage en monorepo)
  watchIgnoreFiles: ['**/frontend/**', '**/scripts/**', '**/data/**', '**/docs/**', '**/*.md', '**/.turbo/**'],
  // Bouton "Aperçu" du Content Manager : ouvre le front Next.js en mode brouillon (Draft Mode)
  // via FRONTEND_URL/api/preview?secret=...&slug=...&locale=...&status=draft|published (config request FRONT)
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
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
});

export default config;
