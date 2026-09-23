// Remise a zero de la demo : base SQLite + uploads restaures depuis data/demo-export.tar (chemins relatifs a apps/backend).
// 1. refuse si Strapi tourne encore sur PORT (SQLite serait supprimee sous ses pieds) ;
// 2. supprime la base et public/uploads ;
// 3. `strapi import --force` (le bootstrap de src/index.ts recree admin, locales, tokens, webhook) ;
// 4. repli : si l'import echoue (schemas modifies depuis l'export), seed complet via le Document Service.
import { existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, isPortInUse, loadEnv } from './lib/env';

const t0 = Date.now();
const env = loadEnv();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
  return { ok: res.status === 0, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

async function main() {
  const port = Number(env.PORT || 1337);
  if (await isPortInUse(port)) {
    console.error(`[reset] Un serveur écoute déjà sur le port ${port}. Arrêtez Strapi avant la remise à zéro.`);
    process.exit(1);
  }

  const dbFile = join(ROOT, env.DATABASE_FILENAME || '.tmp/data.db');
  for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(dbFile + suffix, { force: true });
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  const uploads = join(ROOT, 'public', 'uploads');
  mkdirSync(uploads, { recursive: true });
  for (const f of readdirSync(uploads)) if (f !== '.gitkeep') rmSync(join(uploads, f), { recursive: true, force: true });
  // Logs d'une répétition précédente : récapitulatif des crons et journaux laissés par `strapi import` / `export`.
  rmSync(join(ROOT, 'logs', 'crons.log'), { force: true });
  removeImportLogs();
  console.log(`[reset] Base, uploads et logs supprimés (${elapsed()})`);

  const archive = join(ROOT, 'data', 'demo-export.tar');
  let mode = 'import';
  if (existsSync(archive)) {
    console.log('[reset] Restauration de data/demo-export.tar via strapi import...');
    const res = run('npx', ['strapi', 'import', '-f', archive, '--force']);
    if (!res.ok) {
      mode = 'seed';
      const reason = res.out.split('\n').filter((l) => /error|schema/i.test(l)).slice(0, 3).join('\n');
      console.warn(`[reset] Import impossible (schémas modifiés depuis l'export ?) :\n${reason}`);
      console.warn('[reset] Repli sur le seed complet. Pensez à régénérer l\'export : npm run demo:export');
    }
  } else {
    mode = 'seed';
    console.warn('[reset] data/demo-export.tar absent : seed complet.');
  }

  if (mode === 'seed') {
    for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(dbFile + suffix, { force: true });
    const res = spawnSync('npx', ['tsx', 'scripts/seed/index.ts'], { cwd: ROOT, stdio: 'inherit' });
    if (res.status !== 0) {
      console.error('[reset] Échec du seed.');
      process.exit(1);
    }
  }

  removeImportLogs();
  console.log(`[reset] Terminé en ${elapsed()} (mode : ${mode}). Lancer ensuite : npm run demo:start`);
}

main();

// `strapi import` et `strapi export` écrivent un fichier import_<date>.log / export_<date>.log à la racine
// de apps/backend à chaque exécution.
function removeImportLogs() {
  for (const f of readdirSync(ROOT)) if (/^(import|export)_.*\.log$/.test(f)) rmSync(join(ROOT, f), { force: true });
}
