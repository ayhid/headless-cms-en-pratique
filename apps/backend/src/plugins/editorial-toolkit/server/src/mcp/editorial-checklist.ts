import { z } from '@strapi/utils';

import { ARTICLE_UID, PLUGIN_ID } from '../../../shared/constants';

/**
 * MCP tool `editorial_checklist`: returns the publication checklist of an article.
 * Registered in register.ts through strapi.ai.mcp.registerTool().
 *
 * Auth: the tool is listed only for Admin tokens allowed to read articles in the
 * Content Manager (same permission as the built-in article tools).
 */

const itemSchema = z.object({
  key: z.string(),
  label: z.string(),
  ok: z.boolean(),
  required: z.boolean(),
  detail: z.string(),
});

const outputSchema = z.object({
  found: z.boolean(),
  documentId: z.string(),
  locale: z.string().nullable(),
  status: z.string(),
  title: z.string().nullable(),
  ready: z.boolean(),
  done: z.number(),
  total: z.number(),
  items: z.array(itemSchema),
  summary: z.string(),
});

const inputSchema = z.object({
  documentId: z.string().min(1).describe('documentId of the article (Strapi 5 document identifier).'),
  locale: z.string().optional().describe('Locale code, for example "fr" or "en". Defaults to the default locale.'),
  status: z
    .enum(['draft', 'published'])
    .optional()
    .describe('Version to check. Defaults to "draft", the version an editor is about to publish.'),
});

export const editorialChecklistTool = {
  name: 'editorial_checklist',
  title: 'Check-list éditoriale',
  description:
    'Returns the publication checklist of an article (cover, excerpt length, SEO, blocks, publication date, editorial tone) and whether it is ready to publish.',
  auth: {
    policies: [{ action: 'plugin::content-manager.explorer.read', subject: ARTICLE_UID }],
  },
  resolveInputSchema: () => inputSchema,
  resolveOutputSchema: () => outputSchema,
  createHandler:
    (strapi: any) =>
    async ({ args }: { args: z.infer<typeof inputSchema> }) => {
      const status = args.status ?? 'draft';
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service('editorial')
        .getChecklist(args.documentId, args.locale, status);

      const structured: z.infer<typeof outputSchema> = result
        ? {
            found: true,
            documentId: args.documentId,
            locale: result.locale,
            status,
            title: result.title,
            ready: result.ready,
            done: result.done,
            total: result.total,
            items: result.items,
            summary: `${result.title} : ${result.done}/${result.total} critères remplis, ${
              result.ready ? 'prêt à publier' : 'pas encore prêt à publier'
            }.`,
          }
        : {
            found: false,
            documentId: args.documentId,
            locale: args.locale ?? null,
            status,
            title: null,
            ready: false,
            done: 0,
            total: 0,
            items: [],
            summary: `Aucun article ${status === 'draft' ? 'brouillon' : 'publié'} avec le documentId ${args.documentId}.`,
          };

      const lines = [
        structured.summary,
        ...structured.items.map((item) => `${item.ok ? '[OK]' : '[  ]'} ${item.label} : ${item.detail}`),
      ];

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
        structuredContent: structured,
      };
    },
};
