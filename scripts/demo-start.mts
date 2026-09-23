// Demarre Strapi (strapi develop) et le front Next.js ensemble, logs prefixes [strapi] / [front].
// Ports : PORT (Strapi, defaut .env = 1337) et FRONT_PORT (Next, defaut 3000).
// Front : FRONT_MODE=prod (defaut, next build puis next start : le cache de donnees et la
// revalidation par webhook se comportent comme en production) ou FRONT_MODE=dev (next dev,
// qui ne met rien en cache : la demo du webhook n'y prouve rien). `npm run demo:start:dev` = dev.
// Le build Next n'interroge pas Strapi (pages rendues a la requete), il peut tourner en parallele.
// Ex. phase 2 : PORT=1338 FRONT_PORT=3001 npm run demo:start
import concurrently from 'concurrently';
import { ROOT, loadEnv } from './lib/env.ts';

const env = loadEnv();
const strapiPort = env.PORT || '1337';
const frontPort = env.FRONT_PORT || '3000';
const frontendUrl = env.FRONT_PORT ? `http://localhost:${frontPort}` : env.FRONTEND_URL || `http://localhost:${frontPort}`;
const frontMode = env.FRONT_MODE === 'dev' ? 'dev' : 'prod';

console.log(`Démarrage : Strapi sur http://localhost:${strapiPort}/admin, front sur ${frontendUrl}`);
console.log(
  frontMode === 'prod'
    ? 'Front en mode production (next build puis next start) : compter environ 15 s avant que le front réponde.'
    : 'Front en mode développement (next dev) : aucun cache, la revalidation par webhook ne se voit pas.',
);

const { result } = concurrently(
  [
    {
      name: 'strapi',
      command: 'npx strapi develop',
      cwd: ROOT,
      prefixColor: 'magenta',
      env: { PORT: strapiPort, FRONTEND_URL: frontendUrl },
    },
    {
      name: 'front',
      command: frontMode === 'prod' ? 'npm run build && npm run start' : 'npm run dev',
      cwd: `${ROOT}/frontend`,
      prefixColor: 'cyan',
      env: { PORT: frontPort, STRAPI_URL: `http://localhost:${strapiPort}` },
    },
  ],
  { killOthersOn: ['failure', 'success'], prefix: '[{name}]', restartTries: 0 },
);

result.then(
  () => process.exit(0),
  () => process.exit(1),
);
