// Demarre Strapi (strapi develop) et le front Next.js ensemble, logs prefixes [strapi] / [front].
// Ports : PORT (Strapi, defaut .env = 1337) et FRONT_PORT (Next, defaut 3000).
// Ex. phase 2 : PORT=1338 FRONT_PORT=3001 npm run demo:start
import concurrently from 'concurrently';
import { ROOT, loadEnv } from './lib/env.ts';

const env = loadEnv();
const strapiPort = env.PORT || '1337';
const frontPort = env.FRONT_PORT || '3000';
const frontendUrl = env.FRONT_PORT ? `http://localhost:${frontPort}` : env.FRONTEND_URL || `http://localhost:${frontPort}`;

console.log(`Demarrage : Strapi sur http://localhost:${strapiPort}/admin, front sur ${frontendUrl}`);

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
      command: 'npm run dev',
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
