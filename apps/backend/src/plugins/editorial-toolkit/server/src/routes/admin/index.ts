/*
 * Admin routes: served under /editorial-toolkit/* and protected by the admin JWT
 * (same session as the admin panel). They are not part of the public Content API.
 */
const readArticles = {
  name: 'admin::hasPermissions',
  // [action, subject]: the admin must be allowed to read articles in the Content Manager.
  config: { actions: [['plugin::content-manager.explorer.read', 'api::article.article']] },
};

export default () => ({
  type: 'admin' as const,
  routes: [
    {
      method: 'GET' as const,
      path: '/dashboard',
      handler: 'dashboard.index',
      config: { policies: ['admin::isAuthenticatedAdmin', readArticles] },
    },
    {
      method: 'GET' as const,
      path: '/checklist/:documentId',
      handler: 'dashboard.checklist',
      config: { policies: ['admin::isAuthenticatedAdmin', readArticles] },
    },
    {
      method: 'GET' as const,
      path: '/info',
      handler: 'dashboard.info',
      config: { policies: ['admin::isAuthenticatedAdmin'] },
    },
  ],
});
