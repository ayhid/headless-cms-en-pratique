// Checks of the CRONS agent: cron enabled and tasks declared, logs/crons.log recently written,
// no article left as a never-published draft with a past publishAt.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckFn, CheckResult } from './types';

const TASKS = ['publishScheduledArticles', 'draftsDigest'];

const check: CheckFn = async (ctx) => {
  const results: CheckResult[] = [];
  const demo = ctx.env.DEMO_MODE === 'true';

  // 1. Cron enabled in config/server.ts and tasks declared in config/cron-tasks.ts
  const server = readFileSync(join(ctx.root, 'config', 'server.ts'), 'utf8');
  const enabled = /^\s*cron\s*:\s*\{[^}]*enabled\s*:\s*true/m.test(server) && /tasks\s*:\s*cronTasks/.test(server);
  if (!enabled) {
    results.push({
      ok: false,
      message:
        "Cron pas encore activé : ajouter cron: { enabled: true, tasks: cronTasks } dans config/server.ts (voir docs/handoff/config-requests/crons.md)",
    });
  } else {
    const tasksFile = join(ctx.root, 'config', 'cron-tasks.ts');
    const tasks = existsSync(tasksFile) ? readFileSync(tasksFile, 'utf8') : '';
    const missing = TASKS.filter((t) => !new RegExp(`^\\s*${t}\\s*:\\s*\\{`, 'm').test(tasks));
    results.push({
      ok: missing.length === 0,
      message:
        missing.length === 0
          ? `Cron activé, tâches déclarées : ${TASKS.join(', ')} (${demo ? 'mode démo : 30 s et 1 min' : 'mode réaliste : 5 min et 8 h'})`
          : `Tâche(s) cron absente(s) de config/cron-tasks.ts : ${missing.join(', ')}`,
    });
  }

  // 2. logs/crons.log written recently (the publication task writes a line at every run)
  const logFile = join(ctx.root, 'logs', 'crons.log');
  const maxAgeSec = demo ? 90 : 6 * 60;
  if (!existsSync(logFile)) {
    results.push({
      ok: false,
      message: enabled
        ? 'logs/crons.log absent : le cron ne s\'est pas encore déclenché (attendre 30 s en mode démo)'
        : 'logs/crons.log absent (normal tant que le cron n\'est pas activé)',
    });
  } else {
    const ageSec = Math.round((Date.now() - statSync(logFile).mtimeMs) / 1000);
    results.push({
      ok: ageSec <= maxAgeSec,
      message: `logs/crons.log écrit il y a ${ageSec} s (maximum attendu : ${maxAgeSec} s)`,
    });
  }

  // 3. No never-published draft whose publishAt is past (Content Manager, as the demo admin)
  const jwt = await ctx.adminJwt();
  const grace = demo ? 45_000 : 6 * 60_000; // time left to the cron to do its job
  const limit = new Date(Date.now() - grace).toISOString();
  const late: string[] = [];
  for (const locale of ['fr', 'en']) {
    const res = await ctx.fetchJson(
      `/content-manager/collection-types/api::article.article?locale=${locale}&pageSize=100`,
      { token: jwt },
    );
    if (res.status !== 200) throw new Error(`Content Manager ${locale} : HTTP ${res.status}`);
    for (const a of res.body?.results ?? []) {
      // Content Manager list status: 'draft' = never published in this locale
      if (a.status === 'draft' && a.publishAt && a.publishAt <= limit) late.push(`« ${a.title} » (${locale})`);
    }
  }
  results.push({
    ok: late.length === 0,
    message:
      late.length === 0
        ? 'Aucun brouillon en retard : tout article dont publishAt est passé est publié'
        : `Brouillon(s) en retard (publishAt passé, jamais publié) : ${late.join(', ')}`,
  });

  return results;
};

export default check;
