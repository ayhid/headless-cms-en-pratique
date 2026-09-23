import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from '../../../shared/constants';

const dashboard = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = () => strapi.plugin(PLUGIN_ID).service('editorial');

  return {
    /** GET /editorial-toolkit/dashboard */
    async index(ctx: any) {
      ctx.body = { data: await service().getDashboard() };
    },

    /** GET /editorial-toolkit/checklist/:documentId?locale=fr&status=draft */
    async checklist(ctx: any) {
      const { documentId } = ctx.params;
      const { locale, status } = ctx.query as { locale?: string; status?: string };
      const result = await service().getChecklist(
        documentId,
        locale,
        status === 'published' ? 'published' : 'draft'
      );
      if (!result) {
        return ctx.notFound('Article introuvable');
      }
      ctx.body = { data: result };
    },

    /** GET /editorial-toolkit/info : lets the checks know the plugin and its custom field are loaded. */
    async info(ctx: any) {
      const customField = strapi.get('custom-fields').get(`plugin::${PLUGIN_ID}.tone`);
      ctx.body = {
        data: {
          plugin: PLUGIN_ID,
          customField: customField ? { uid: `plugin::${PLUGIN_ID}.tone`, type: customField.type } : null,
          toneFieldOnArticle: service().getToneField(),
        },
      };
    },
  };
};

export default dashboard;
