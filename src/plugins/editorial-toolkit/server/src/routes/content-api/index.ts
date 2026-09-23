// No public Content API route: everything the plugin exposes is reserved to the admin panel.
export default () => ({
  type: 'content-api' as const,
  routes: [],
});
