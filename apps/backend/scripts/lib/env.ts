// Lecture minimale de apps/backend/.env (sans dependance) : les variables deja definies dans
// l'environnement gagnent, comme chez Strapi (ex. PORT=1338 npm run demo:start).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';

// ROOT : le projet Strapi (apps/backend). REPO_ROOT : la racine du monorepo (deux niveaux au-dessus).
export const ROOT = join(__dirname, '..', '..');
export const REPO_ROOT = join(ROOT, '..', '..');

export function loadEnv(file = join(ROOT, '.env')): Record<string, string> {
  const values: Record<string, string> = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) values[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) values[k] = v;
  return values;
}

export function isPortInUse(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}
