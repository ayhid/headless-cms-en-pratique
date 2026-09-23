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

async function articleTools(ctx: CheckContext, token: string) {
  const res = await rpc(ctx, token, 'tools/list');
  const names: string[] = (res.rpc?.result?.tools ?? []).map((t: { name: string }) => t.name);
  return { status: res.status, names: names.filter((n) => n.includes('article')) };
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
  }

  return results;
};

export default check;
