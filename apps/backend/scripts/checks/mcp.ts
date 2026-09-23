// Controles du serveur MCP natif de Strapi (agent MCP).
// - /mcp repond et exige une authentification (401 sans token) ;
// - un API token Content API est rejete (401) ;
// - tools/list avec l'Admin token complet expose les 8 tools article ;
// - tools/list avec l'Admin token en lecture seule n'expose que list_article et get_article.
// Avant integration (mcp.enabled a false, ou tokens absents de .env), le message le dit clairement.
import type { CheckContext, CheckFn, CheckResult } from './types';

const FULL_TOOLS = [
  'list_article',
  'get_article',
  'create_article',
  'update_article',
  'delete_article',
  'publish_article',
  'unpublish_article',
  'discard_article_draft',
];
const READONLY_TOOLS = ['list_article', 'get_article'];

// Le transport Streamable HTTP repond en text/event-stream : on extrait la ligne `data:`.
function parseRpc(body: unknown): any {
  if (body && typeof body === 'object') return body;
  const text = String(body ?? '');
  const line = text.split('\n').find((l) => l.startsWith('data: '));
  try {
    return line ? JSON.parse(line.slice(6)) : null;
  } catch {
    return null;
  }
}

async function rpc(ctx: CheckContext, token: string | undefined, method: string, params: object = {}) {
  const res = await ctx.fetchJson('/mcp', {
    method: 'POST',
    token,
    headers: { Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return { status: res.status, rpc: parseRpc(res.body) };
}

async function allTools(ctx: CheckContext, token: string) {
  const res = await rpc(ctx, token, 'tools/list');
  const names: string[] = (res.rpc?.result?.tools ?? []).map((t: { name: string }) => t.name);
  return { status: res.status, names };
}

async function articleTools(ctx: CheckContext, token: string) {
  const { status, names } = await allTools(ctx, token);
  return { status, names: names.filter((n) => n.includes('article')) };
}

// Tools de la médiathèque (doc strapi-mcp-server, « Media Library tools ») attendus par token.
const MEDIA_READ_TOOLS = ['media_list_assets', 'media_get_asset', 'media_list_folders'];
const MEDIA_FULL_TOOLS = [
  ...MEDIA_READ_TOOLS,
  'media_update_asset',
  'media_move_assets',
  'media_delete_assets',
  'media_create_folder',
  'media_rename_folder',
  'media_move_folder',
  'media_delete_folder',
];

// Médias exacts attendus, et aucun tool hors article, médias, editorial_checklist et log
// (dérive constatée le 23/09 : users et catégories exposés après une modification dans l'admin).
async function mediaCheck(ctx: CheckContext, token: string, label: string, expected: string[]): Promise<CheckResult> {
  const { status, names } = await allTools(ctx, token);
  const media = names.filter((n) => n.startsWith('media_'));
  const exact = media.length === expected.length && expected.every((n) => media.includes(n));
  const unexpected = names.filter(
    (n) => !n.includes('article') && !n.startsWith('media_') && n !== 'editorial_checklist' && n !== 'log',
  );
  const ok = status === 200 && exact && unexpected.length === 0;
  return {
    ok,
    message: ok
      ? `MCP : ${label}, ${media.length} tools médiathèque, aucun tool hors article et médias`
      : `MCP : ${label} (HTTP ${status}), médias : ${media.join(', ') || 'aucun'} ; tools inattendus : ${
          unexpected.join(', ') || 'aucun'
        } (redémarrer Strapi resynchronise les permissions)`,
  };
}

const check: CheckFn = async (ctx) => {
  const results: CheckResult[] = [];

  const anonymous = await rpc(ctx, undefined, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'demo-check', version: '1.0.0' },
  });
  if (anonymous.status !== 401) {
    return {
      ok: false,
      message:
        `MCP pas encore activé : POST /mcp répond HTTP ${anonymous.status} au lieu de 401. ` +
        'Passer mcp.enabled à true dans config/server.ts (docs/handoff/config-requests/mcp.md) puis redémarrer Strapi.',
    };
  }
  results.push({ ok: true, message: 'MCP actif : POST /mcp sans token répond 401 (Authentication required)' });

  const contentApi = await rpc(ctx, ctx.env.STRAPI_READ_TOKEN, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'demo-check', version: '1.0.0' },
  });
  results.push({
    ok: contentApi.status === 401,
    message: `MCP : token Content API (STRAPI_READ_TOKEN) rejeté par /mcp (HTTP ${contentApi.status}, 401 attendu)`,
  });

  const full = ctx.env.STRAPI_MCP_ADMIN_TOKEN;
  if (!full) {
    results.push({
      ok: false,
      message: 'MCP : STRAPI_MCP_ADMIN_TOKEN absent de .env (bootstrap des Admin tokens pas encore intégré)',
    });
  } else {
    const { status, names } = await articleTools(ctx, full);
    const missing = FULL_TOOLS.filter((n) => !names.includes(n));
    results.push({
      ok: status === 200 && missing.length === 0,
      message:
        missing.length === 0
          ? `MCP : Admin token complet, tools/list expose ${names.length} tools article (dont delete_article et publish_article)`
          : `MCP : Admin token complet (HTTP ${status}), tools article manquants : ${missing.join(', ')}`,
    });
    results.push(await mediaCheck(ctx, full, 'Admin token complet', MEDIA_FULL_TOOLS));
  }

  const readonly = ctx.env.STRAPI_MCP_READONLY_TOKEN;
  if (!readonly) {
    results.push({
      ok: false,
      message: 'MCP : STRAPI_MCP_READONLY_TOKEN absent de .env (bootstrap des Admin tokens pas encore intégré)',
    });
  } else {
    const { status, names } = await articleTools(ctx, readonly);
    const exact = names.length === READONLY_TOOLS.length && READONLY_TOOLS.every((n) => names.includes(n));
    results.push({
      ok: status === 200 && exact,
      message: exact
        ? 'MCP : Admin token lecture seule, seulement list_article et get_article (pas de publish_article)'
        : `MCP : Admin token lecture seule (HTTP ${status}), tools article inattendus : ${names.join(', ') || 'aucun'}`,
    });
    results.push(await mediaCheck(ctx, readonly, 'Admin token lecture seule', MEDIA_READ_TOOLS));
  }

  return results;
};

export default check;
