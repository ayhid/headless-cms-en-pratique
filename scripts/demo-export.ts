// Regenere data/demo-export.tar (export Strapi non chiffre, non compresse) depuis la base courante.
// A lancer apres un `npm run seed` sur base vide, ou apres modification volontaire du contenu de demo.
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/env';

const target = join(ROOT, 'data', 'demo-export');
rmSync(`${target}.tar`, { force: true });
const res = spawnSync('npx', ['strapi', 'export', '--no-encrypt', '--no-compress', '-f', target], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(res.status ?? 1);
