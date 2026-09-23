// Cree les 2 Admin tokens du serveur MCP via l'API REST admin de Strapi 5.54
// (routes de @strapi/admin : POST /admin/login, GET/POST /admin/admin-tokens, DELETE /admin/admin-tokens/:id).
//
// Usage (Strapi doit tourner, Node >= 20, aucune dependance) :
//   PORT=1338 node docs/mcp/create-tokens.mjs             # cree les tokens manquants
//   PORT=1338 node docs/mcp/create-tokens.mjs --recreate  # supprime puis recree les 2 tokens
//
// La valeur en clair d'un Admin token n'est renvoyee qu'une seule fois, a la creation : le script
// l'affiche sous forme de lignes `export ...` a coller dans son shell (ou dans apps/backend/.env).
// Apres integration, le bootstrap du SOCLE cree ces memes tokens avec des valeurs FIXES
// (voir docs/handoff/config-requests/mcp.md) : ce script sert alors a montrer l'API, ou de secours.
//
// Fichier en .mjs volontairement (execute par node sans compilation). Depuis le monorepo, docs/ est hors
// du projet Strapi (apps/backend) : `strapi develop` ne le voit plus. Lit apps/backend/.env.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadEnv() {
  const values = {};
  const file = join(ROOT, 'apps', 'backend', '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) values[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return { ...values, ...process.env };
}

const ARTICLE = 'api::article.article';
const LOCALES = ['fr', 'en'];

const MCP_ADMIN_TOKENS = [
  {
    env: 'STRAPI_MCP_ADMIN_TOKEN',
    name: 'MCP Claude Code (complet)',
    description: 'Admin token du serveur MCP : lecture, création, modification, publication et suppression des articles.',
    actions: ['read', 'create', 'update', 'publish', 'delete'],
  },
  {
    env: 'STRAPI_MCP_READONLY_TOKEN',
    name: 'MCP lecture seule',
    description: 'Admin token du serveur MCP : lecture des articles uniquement.',
    actions: ['read'],
  },
];

const env = loadEnv();
const base = env.STRAPI_URL || `http://localhost:${env.PORT || 1337}`;
const recreate = process.argv.includes('--recreate');

try {
  const login = await fetch(`${base}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.DEMO_ADMIN_EMAIL, password: env.DEMO_ADMIN_PASSWORD }),
  });
  if (!login.ok) throw new Error(`connexion admin refusée sur ${base} (HTTP ${login.status})`);
  const jwt = (await login.json()).data.token;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };

  const existing = (await fetch(`${base}/admin/admin-tokens`, { headers }).then((r) => r.json())).data ?? [];

  const lines = [];
  for (const def of MCP_ADMIN_TOKENS) {
    const found = existing.find((t) => t.name === def.name);
    if (found && !recreate) {
      console.log(`[mcp] "${def.name}" existe déjà (id ${found.id}) : conservé. --recreate pour le régénérer.`);
      continue;
    }
    if (found) {
      const del = await fetch(`${base}/admin/admin-tokens/${found.id}`, { method: 'DELETE', headers });
      console.log(`[mcp] "${def.name}" supprimé (HTTP ${del.status})`);
    }
    const res = await fetch(`${base}/admin/admin-tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: def.name,
        description: def.description,
        lifespan: null, // Illimité
        adminPermissions: def.actions.map((a) => ({
          action: `plugin::content-manager.explorer.${a}`,
          subject: ARTICLE,
          // Sans `locales`, le MCP interdit le parametre locale ("No locale access for this action").
          // Sans `fields`, tous les champs sont autorises.
          properties: { locales: LOCALES },
        })),
      }),
    });
    const body = await res.json();
    if (res.status !== 201) throw new Error(`création de "${def.name}" refusée (HTTP ${res.status}) : ${JSON.stringify(body)}`);
    console.log(`[mcp] "${def.name}" créé (id ${body.data.id}, kind ${body.data.kind}, article : ${def.actions.join(', ')})`);
    lines.push(`export ${def.env}=${body.data.accessKey}`);
  }
  if (lines.length) {
    console.log('\n# À coller dans le shell (valeurs affichées une seule fois) :');
    console.log(lines.join('\n'));
  }
} catch (err) {
  console.error(`[mcp] Erreur : ${err.message}`);
  process.exit(1);
}
