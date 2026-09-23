// Contrôles du plugin local "Boîte à outils éditoriale" (src/plugins/editorial-toolkit).
// - build présent (dist/server et dist/admin), sinon Strapi ne peut pas charger le plugin ;
// - plugin listé par GET /admin/plugins ;
// - custom field "Ton éditorial" enregistré côté serveur (type natif string) et utilisé par Article ;
// - route du tableau de bord GET /editorial-toolkit/dashboard ;
// - mode révélateur : le build admin (dist/admin) injecte bien les 6 injection zones attendues
//   (et pas editView.informations, zone interne), et quelles zones le Content Manager installé affiche ;
// - tool MCP editorial_checklist listé par tools/list (seulement si le serveur MCP est activé).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckContext, CheckFn, CheckResult } from './types';

const PLUGIN = 'editorial-toolkit';
const MCP_TOKEN_NAME = 'Contrôle demo:check (plugin éditorial)';

async function checkBuild(ctx: CheckContext): Promise<CheckResult> {
  const dir = join(ctx.root, 'src', 'plugins', PLUGIN, 'dist');
  const files = ['server/index.js', 'admin/index.mjs'];
  const missing = files.filter((file) => !existsSync(join(dir, file)));
  return {
    ok: missing.length === 0,
    message:
      missing.length === 0
        ? `Plugin ${PLUGIN} compilé (dist/server et dist/admin présents)`
        : `Plugin ${PLUGIN} non compilé (manque ${missing.join(', ')}) : lancer npm run plugin:build`,
  };
}

/** Zones du mode révélateur (admin/src/components/InjectionZoneReveal.tsx). */
const REVEALED_ZONES = [
  'listView.actions',
  'listView.publishModalAdditionalInfos',
  'listView.unpublishModalAdditionalInfos',
  'listView.deleteModalAdditionalInfos',
  'editView.right-links',
  'preview.actions',
];

async function checkRevealZones(ctx: CheckContext): Promise<CheckResult[]> {
  const dir = join(ctx.root, 'src', 'plugins', PLUGIN, 'dist', 'admin');
  if (!existsSync(dir)) {
    return [{ ok: false, message: `Mode révélateur : dist/admin absent, lancer npm run plugin:build` }];
  }
  const bundle = readdirSync(dir)
    .filter((file) => file.endsWith('.mjs'))
    .map((file) => readFileSync(join(dir, file), 'utf8'))
    .join('\n');
  // Le bundle écrit les chaînes entre guillemets doubles ; un commentaire ne compte pas.
  const missing = REVEALED_ZONES.filter((zone) => !bundle.includes(`"${zone}"`));
  const hasInject = bundle.includes('injectComponent(');
  const internal = bundle.includes('"editView.informations"');
  const results: CheckResult[] = [
    {
      ok: hasInject && missing.length === 0 && !internal,
      message: !hasInject
        ? `Mode révélateur : aucun appel à injectComponent dans dist/admin (relancer npm run plugin:build)`
        : missing.length > 0
          ? `Mode révélateur : zone(s) absente(s) du build admin : ${missing.join(', ')}`
          : internal
            ? `Mode révélateur : editView.informations (zone interne) ne doit pas être injectée`
            : `Mode révélateur : ${REVEALED_ZONES.length} injection zones dans le build admin (${REVEALED_ZONES.join(', ')}), pas editView.informations`,
    },
  ];

  // Information : zones réellement affichées par le Content Manager installé (<InjectionZone area="...">).
  const cmDir = join(ctx.root, 'node_modules', '@strapi', 'content-manager', 'dist', 'admin');
  const cmFiles = [
    'pages/ListView/ListViewPage.mjs',
    'pages/EditView/components/Panels.mjs',
    'preview/components/PreviewHeader.mjs',
    'pages/ListView/components/BulkActions/Actions.mjs',
  ].map((file) => join(cmDir, file));
  if (cmFiles.every((file) => existsSync(file))) {
    const cm = cmFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
    const rendered = REVEALED_ZONES.filter((zone) => cm.includes(`area: "${zone}"`));
    const notRendered = REVEALED_ZONES.filter((zone) => !rendered.includes(zone));
    results.push({
      ok: rendered.length > 0,
      message:
        `Mode révélateur : zones affichées par le Content Manager installé : ${rendered.join(', ') || 'aucune'}` +
        (notRendered.length ? ` ; déclarées mais non affichées : ${notRendered.join(', ')}` : ''),
    });
  }
  return results;
}

async function checkListed(ctx: CheckContext, jwt: string): Promise<CheckResult> {
  const res = await ctx.fetchJson('/admin/plugins', { token: jwt });
  const plugin = (res.body?.plugins ?? []).find((p: any) => p.name === PLUGIN);
  return {
    ok: res.status === 200 && Boolean(plugin),
    message: plugin
      ? `Plugin chargé : « ${plugin.displayName} » listé par GET /admin/plugins`
      : `Plugin ${PLUGIN} absent de GET /admin/plugins (HTTP ${res.status}) : vérifier config/plugins.ts`,
  };
}

async function checkCustomField(ctx: CheckContext, jwt: string): Promise<CheckResult[]> {
  const res = await ctx.fetchJson(`/${PLUGIN}/info`, { token: jwt });
  const field = res.body?.data?.customField;
  const toneField = res.body?.data?.toneFieldOnArticle;
  return [
    {
      ok: res.status === 200 && field?.type === 'string',
      message: field
        ? `Custom field ${field.uid} enregistré (type natif ${field.type})`
        : `Custom field plugin::${PLUGIN}.tone non enregistré (HTTP ${res.status})`,
    },
    {
      ok: Boolean(toneField),
      message: toneField
        ? `Article utilise le custom field dans l’attribut « ${toneField} »`
        : `Article n’utilise pas encore le custom field (ajouter l’attribut tone au schéma)`,
    },
  ];
}

async function checkDashboard(ctx: CheckContext, jwt: string): Promise<CheckResult> {
  const res = await ctx.fetchJson(`/${PLUGIN}/dashboard`, { token: jwt });
  const data = res.body?.data;
  if (res.status !== 200 || !data) {
    return { ok: false, message: `GET /${PLUGIN}/dashboard : HTTP ${res.status}` };
  }
  const locales = (data.perLocale ?? []).map((l: any) => `${l.code} ${l.total}`).join(', ');
  return {
    ok: data.totals.total > 0,
    message: `Tableau de bord : ${data.totals.total} article(s) (${locales}), ${data.readyToPublish.length} brouillon(s) prêt(s) à publier, ${data.toComplete.length} à compléter`,
  };
}

/** POST JSON-RPC sur /mcp ; renvoie le statut, le corps (JSON ou SSE) et l'id de session. */
async function mcpRpc(ctx: CheckContext, token: string | null, body: object, sessionId?: string) {
  const res = await fetch(`${ctx.strapiUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const dataLine = text.split('\n').find((line) => line.startsWith('data:'));
  let json: any = null;
  try {
    json = JSON.parse(dataLine ? dataLine.slice(5) : text);
  } catch {
    json = null;
  }
  return { status: res.status, json, sessionId: res.headers.get('mcp-session-id') ?? sessionId };
}

async function checkMcpTool(ctx: CheckContext, jwt: string): Promise<CheckResult> {
  // 401 sans jeton = serveur MCP actif ; 404/405 = désactivé (mcp.enabled: false).
  const probe = await mcpRpc(ctx, null, { jsonrpc: '2.0', id: 0, method: 'ping' });
  if (probe.status !== 401) {
    return { ok: true, message: `Serveur MCP désactivé (HTTP ${probe.status}) : tool editorial_checklist non contrôlé` };
  }

  // Jeton Admin dédié, recréé à chaque passage (la clé n'est lisible qu'à la création).
  const list = await ctx.fetchJson('/admin/admin-tokens', { token: jwt });
  for (const token of (list.body?.data ?? []).filter((t: any) => t.name === MCP_TOKEN_NAME)) {
    await ctx.fetchJson(`/admin/admin-tokens/${token.id}`, { method: 'DELETE', token: jwt });
  }
  const created = await ctx.fetchJson('/admin/admin-tokens', {
    method: 'POST',
    token: jwt,
    body: JSON.stringify({
      name: MCP_TOKEN_NAME,
      description: 'Créé par scripts/checks/plugin.ts : lecture des articles uniquement',
      lifespan: null,
      adminPermissions: [{ action: 'plugin::content-manager.explorer.read', subject: 'api::article.article' }],
    }),
  });
  const accessKey = created.body?.data?.accessKey;
  if (!accessKey) {
    return { ok: false, message: `Création du jeton Admin de contrôle impossible (HTTP ${created.status})` };
  }

  const init = await mcpRpc(ctx, accessKey, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'demo-check', version: '1.0.0' } },
  });
  await mcpRpc(ctx, accessKey, { jsonrpc: '2.0', method: 'notifications/initialized' }, init.sessionId);
  const tools = await mcpRpc(ctx, accessKey, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, init.sessionId);
  const names: string[] = (tools.json?.result?.tools ?? []).map((t: any) => t.name);
  return {
    ok: names.includes('editorial_checklist'),
    message: names.includes('editorial_checklist')
      ? `MCP : tool editorial_checklist listé (${names.length} tools pour un jeton lecture articles)`
      : `MCP : tool editorial_checklist absent de tools/list (HTTP ${tools.status}, tools : ${names.join(', ') || 'aucun'})`,
  };
}

const check: CheckFn = async (ctx) => {
  const results: CheckResult[] = [await checkBuild(ctx), ...(await checkRevealZones(ctx))];
  const jwt = await ctx.adminJwt();
  results.push(await checkListed(ctx, jwt));
  results.push(...(await checkCustomField(ctx, jwt)));
  results.push(await checkDashboard(ctx, jwt));
  results.push(await checkMcpTool(ctx, jwt));
  return results;
};

export default check;
