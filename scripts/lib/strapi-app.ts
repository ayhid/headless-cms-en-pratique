// Demarre une instance Strapi "headless" (sans serveur HTTP) pour les scripts (seed, etc.).
// Le bootstrap de src/index.ts s'execute pendant load() : admin, locales, tokens, webhook.
import { compileStrapi, createStrapi } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

export async function loadStrapi(): Promise<Core.Strapi> {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'warn';
  return app;
}
