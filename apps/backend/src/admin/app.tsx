import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    // Admin en francais. "en" reste toujours disponible (langue de repli imposee par Strapi).
    // La langue par defaut de l'admin de demo est forcee a "fr" par le bootstrap (preferedLanguage).
    locales: ['fr'],
  },
  bootstrap(app: StrapiApp) {},
};
