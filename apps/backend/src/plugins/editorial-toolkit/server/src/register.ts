import type { Core } from '@strapi/strapi';

import { PLUGIN_ID, TONE_FIELD_NAME } from '../../shared/constants';
import { editorialChecklistTool } from './mcp/editorial-checklist';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  /*
   * =====================================================================================
   *  CUSTOM FIELD "Ton éditorial"
   *
   *  A custom field does NOT create a new data type: it relies on an existing native
   *  Strapi type (here `string`) and only changes the input shown in the admin panel.
   *  In the database the value is a plain string ('factuel', 'pedagogique', ...).
   *  In schema.json the attribute reads:
   *    { "type": "customField", "customField": "plugin::editorial-toolkit.tone" }
   *
   *  `plugin` must match the `pluginId` used in admin/src/index.ts.
   * =====================================================================================
   */
  strapi.customFields.register({
    name: TONE_FIELD_NAME,
    plugin: PLUGIN_ID,
    type: 'string',
    inputSize: {
      default: 12,
      isResizable: false,
    },
  });

  /*
   * MCP tool: registrations must happen during register(), while the MCP server is idle
   * (https://docs.strapi.io/cms/plugins-development/extend-mcp-server). The tool is only
   * exposed when `mcp.enabled` is true in config/server.ts; registering it is harmless otherwise.
   */
  const mcp = (strapi as unknown as { ai?: { mcp?: { registerTool: (tool: unknown) => void } } }).ai?.mcp;
  if (mcp) {
    mcp.registerTool(editorialChecklistTool);
  }
};

export default register;
