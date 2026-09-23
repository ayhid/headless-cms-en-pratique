import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  // Webhooks : chaque appel porte le secret partagé avec le front (config request WEBHOOKS).
  // populateRelations n'existe plus en Strapi 5 : option retirée.
  webhooks: {
    defaultHeaders: { Authorization: `Bearer ${env('WEBHOOK_SECRET')}` },
  },
  // Crons (config/cron-tasks.ts) : publication programmée + récapitulatif des brouillons (config request CRONS)
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
  // Serveur MCP natif, endpoint /mcp, Admin token obligatoire (config request MCP)
  mcp: {
    enabled: true,
  },
});

export default config;
