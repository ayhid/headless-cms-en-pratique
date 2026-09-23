import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
  // GraphQL (doc cms/plugins/graphql) : endpoint /graphql, sandbox Apollo hors production.
  // depthLimit et maxLimit bornent les requêtes (sans eux, profondeur et taille illimitées).
  graphql: {
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      depthLimit: 7,
      defaultLimit: 25,
      maxLimit: 100,
    },
  },
  // Documentation OpenAPI / Swagger (doc cms/plugins/documentation), servie sur /documentation.
  // La doc Strapi marque ce plugin « Unmaintained » : vérifié en 5.54.0, voir docs/handoff/socle.md.
  documentation: {
    enabled: true,
    config: {
      info: {
        version: '1.0.0',
        title: 'API de la démo Strapi',
        description: 'Documentation OpenAPI générée par le plugin Documentation.',
      },
      'x-strapi-config': {
        plugins: ['upload'],
      },
    },
  },
  // Plugin local "Boîte à outils éditoriale" (src/plugins/editorial-toolkit).
  // Il est chargé depuis son dossier dist/ : lancer `npm run plugin:build` après chaque modification.
  'editorial-toolkit': {
    enabled: true,
    resolve: './src/plugins/editorial-toolkit',
  },
});

export default config;
