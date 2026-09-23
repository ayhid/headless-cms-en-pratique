// Verification de la demo (Strapi doit tourner : npm run demo:start).
// - controles du SOCLE : API fr/en avec cover, preview des brouillons, admin, webhook ;
// - chargement automatique de scripts/checks/*.ts (un fichier par agent, voir scripts/checks/types.ts) ;
// - aucun tiret cadratin (U+2014) dans tout le depot (racine du monorepo, apps/backend et apps/frontend).
// Un seul login admin pour tous les controles, et le JWT est garde dans .tmp/ d'une execution a
// l'autre (le login admin est limite a 5 essais par 5 min) : il n'est refait que s'il est refuse.
// Code de sortie non nul si un controle echoue.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { REPO_ROOT, ROOT, loadEnv } from './lib/env';
import type { CheckContext, CheckFn, CheckResult } from './checks/types';

const env = loadEnv();
const strapiUrl = env.STRAPI_URL || `http://localhost:${env.PORT || 1337}`;
// Meme priorite que demo:start : FRONT_PORT l'emporte sur FRONTEND_URL.
const frontendUrl = env.FRONT_PORT ? `http://localhost:${env.FRONT_PORT}` : env.FRONTEND_URL || 'http://localhost:3000';

async function fetchJson(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any) };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(path.startsWith('http') ? path : `${strapiUrl}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const JWT_FILE = join(ROOT, '.tmp', `demo-check-admin-jwt-${new URL(strapiUrl).port || '80'}`);
let adminJwtCache: string | null = null;
async function adminJwt() {
  if (adminJwtCache) return adminJwtCache;
  // JWT de l'execution precedente : reutilise s'il est encore accepte (meme base, meme secret)
  try {
    const saved = readFileSync(JWT_FILE, 'utf8').trim();
    if (saved && (await fetchJson('/admin/users/me', { token: saved })).status === 200) {
      adminJwtCache = saved;
      return saved;
    }
  } catch {
    // pas de JWT enregistre
  }
  const res = await fetchJson('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: env.DEMO_ADMIN_EMAIL, password: env.DEMO_ADMIN_PASSWORD }),
  });
  const token = res.body?.data?.token ?? res.body?.data?.accessToken;
  if (!token) {
    throw new Error(
      res.status === 429
        ? 'login admin refusé (HTTP 429, trop de connexions en 5 min) : attendre ou redémarrer Strapi'
        : `login admin refusé (HTTP ${res.status})`,
    );
  }
  adminJwtCache = token as string;
  try {
    mkdirSync(dirname(JWT_FILE), { recursive: true });
    writeFileSync(JWT_FILE, adminJwtCache);
  } catch {
    // cache facultatif
  }
  return adminJwtCache;
}

const ctx: CheckContext = { root: ROOT, env, strapiUrl, frontendUrl, fetchJson, adminJwt };

// ---------------------------------------------------------------------------
// Controles du SOCLE
// ---------------------------------------------------------------------------
async function checkHealth(): Promise<CheckResult> {
  try {
    const res = await fetch(`${strapiUrl}/_health`);
    return { ok: res.status === 204, message: `Strapi répond sur ${strapiUrl} (HTTP ${res.status})` };
  } catch {
    return { ok: false, message: `Strapi injoignable sur ${strapiUrl} : lancer npm run demo:start` };
  }
}

async function checkArticles(locale: 'fr' | 'en'): Promise<CheckResult> {
  const res = await fetchJson(`/api/articles?populate=cover&locale=${locale}`, { token: env.STRAPI_READ_TOKEN });
  if (res.status !== 200) return { ok: false, message: `GET /api/articles locale=${locale} : HTTP ${res.status}` };
  const items: any[] = res.body?.data ?? [];
  const withCover = items.filter((a) => a.cover?.url);
  const allLocale = items.every((a) => a.locale === locale);
  const ok = items.length >= 5 && withCover.length === items.length && allLocale;
  return {
    ok,
    message: `API ${locale} : ${items.length} article(s) publié(s), ${withCover.length} avec image de couverture (token lecture seule)`,
  };
}

async function checkPreview(): Promise<CheckResult> {
  const published = await fetchJson('/api/articles?locale=fr', { token: env.STRAPI_PREVIEW_TOKEN });
  const drafts = await fetchJson('/api/articles?locale=fr&status=draft', { token: env.STRAPI_PREVIEW_TOKEN });
  const nPub = published.body?.meta?.pagination?.total ?? -1;
  const nDraft = drafts.body?.meta?.pagination?.total ?? -1;
  return {
    ok: drafts.status === 200 && nDraft > nPub && nPub > 0,
    message: `Token preview : ${nDraft} version(s) brouillon lisible(s) avec status=draft, contre ${nPub} publiée(s)`,
  };
}

async function checkAdmin(): Promise<CheckResult> {
  const jwt = await adminJwt();
  const res = await fetchJson('/content-manager/collection-types/api::article.article?locale=fr&pageSize=100', {
    token: jwt,
  });
  const n = res.body?.results?.length ?? 0;
  return {
    ok: res.status === 200 && n >= 7,
    message: `Admin ${env.DEMO_ADMIN_EMAIL} : login OK, Content Manager liste ${n} article(s) fr (HTTP ${res.status})`,
  };
}

async function checkWebhook(): Promise<CheckResult> {
  const jwt = await adminJwt();
  const res = await fetchJson('/admin/webhooks', { token: jwt });
  const hooks: any[] = res.body?.data ?? [];
  const hook = hooks.find((h) => typeof h.url === 'string' && h.url.endsWith('/api/revalidate'));
  const events = hook?.events?.join(', ') ?? '';
  return {
    ok: !!hook && hook.isEnabled && events.includes('entry.publish') && events.includes('entry.unpublish'),
    message: hook ? `Webhook "${hook.name}" vers ${hook.url} (${events})` : 'Webhook de revalidation absent',
  };
}

// ---------------------------------------------------------------------------
// Aucun tiret cadratin dans le depot
// ---------------------------------------------------------------------------
const EM_DASH = String.fromCharCode(0x2014);
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.next', '.turbo', '.tmp', 'dist', 'build', '.strapi', '.cache', 'uploads', 'data']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.tar', '.gz', '.db', '.woff', '.woff2', '.pdf']);

function findEmDashes(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) findEmDashes(full, found);
    } else if (!BINARY_EXT.has(extname(entry).toLowerCase()) && st.size < 5_000_000) {
      const lines = readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (line.includes(EM_DASH)) found.push(`${relative(REPO_ROOT, full)}:${i + 1}`);
      });
    }
  }
  return found;
}

async function checkNoEmDash(): Promise<CheckResult> {
  const found = findEmDashes(REPO_ROOT);
  return {
    ok: found.length === 0,
    message: found.length === 0 ? 'Aucun tiret cadratin (U+2014) dans le dépôt' : `Tiret cadratin trouvé : ${found.slice(0, 10).join(', ')}`,
  };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
async function runOne(group: string, name: string, fn: () => Promise<CheckResult | CheckResult[]>) {
  if (process.env.CHECK_DEBUG) console.log(`  ... ${group}/${name}`);
  try {
    const out = await fn();
    return (Array.isArray(out) ? out : [out]).map((r) => ({ group, name, ...r }));
  } catch (err: any) {
    return [{ group, name, ok: false, message: `erreur : ${err?.message ?? err}` }];
  }
}

async function main() {
  console.log(`Vérification de la démo (Strapi : ${strapiUrl}, front : ${frontendUrl})\n`);
  const results: Array<CheckResult & { group: string; name: string }> = [];

  const health = await runOne('socle', 'sante', checkHealth);
  results.push(...health);
  if (health[0].ok) {
    results.push(...(await runOne('socle', 'api-fr', () => checkArticles('fr'))));
    results.push(...(await runOne('socle', 'api-en', () => checkArticles('en'))));
    results.push(...(await runOne('socle', 'preview', checkPreview)));
    results.push(...(await runOne('socle', 'admin', checkAdmin)));
    results.push(...(await runOne('socle', 'webhook', checkWebhook)));
  }
  results.push(...(await runOne('socle', 'tiret', checkNoEmDash)));

  const checksDir = join(ROOT, 'scripts', 'checks');
  const files = readdirSync(checksDir)
    .filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    .sort();
  for (const file of files) {
    const agent = file.replace(/\.ts$/, '');
    const mod = await import(join(checksDir, file));
    const fn = (mod.default?.default ?? mod.default) as CheckFn;
    if (typeof fn !== 'function') {
      results.push({ group: agent, name: file, ok: false, message: 'pas de fonction exportée par défaut' });
      continue;
    }
    results.push(...(await runOne(agent, file, () => fn(ctx))));
  }

  // Regroupe l'affichage par agent (scripts/checks/socle.ts rejoint la section SOCLE du debut)
  const order = [...new Set(results.map((r) => r.group))];
  results.sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group));
  let currentGroup = '';
  for (const r of results) {
    if (r.group !== currentGroup) {
      currentGroup = r.group;
      console.log(`== ${currentGroup.toUpperCase()}`);
    }
    console.log(`  ${r.ok ? '[OK]' : '[KO]'} ${r.message}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${failed === 0 ? 'Tout est vert' : `${failed} contrôle(s) en échec`} : ${results.length - failed}/${results.length} OK`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
