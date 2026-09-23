// Simulates three Strapi webhook calls against the Next.js route /api/revalidate:
//   1. entry.publish of an article with the right secret   -> expected 200, tags revalidated
//   2. the same call with a wrong secret                     -> expected 401
//   3. entry.update of an article with the right secret      -> expected 200, ignored
//
// Usage (Next must be running):
//   npx tsx scripts/webhooks/simulate-publish.ts                 (front on FRONTEND_URL from .env)
//   FRONT_PORT=3002 npx tsx scripts/webhooks/simulate-publish.ts (phase 2 worktree)
// Exit code 1 if one case does not behave as expected.
import { loadEnv } from '../lib/env';
import { frontendUrlFrom, sendWebhook, type SimulatedEvent } from './lib';

const env = loadEnv();
const frontendUrl = frontendUrlFrom(env);
const secret = env.WEBHOOK_SECRET;

type Case = { label: string; event: SimulatedEvent; auth: string | null; expect: (r: { status: number; body: any }) => boolean };

const cases: Case[] = [
  {
    label: 'publication simulée (bon secret)',
    event: 'entry.publish',
    auth: `Bearer ${secret}`,
    expect: (r) => r.status === 200 && r.body?.revalidated === true,
  },
  {
    label: 'mauvais secret',
    event: 'entry.publish',
    auth: 'Bearer mauvais-secret',
    expect: (r) => r.status === 401,
  },
  {
    label: 'entry.update (doit être ignoré)',
    event: 'entry.update',
    auth: `Bearer ${secret}`,
    expect: (r) => r.status === 200 && r.body?.ignored === true && r.body?.revalidated === false,
  },
];

async function main() {
  if (!secret) {
    console.error('WEBHOOK_SECRET absent du .env racine : impossible de simuler le webhook.');
    process.exit(1);
  }
  console.log(`Simulation du webhook Strapi vers ${frontendUrl}/api/revalidate\n`);
  let failed = 0;
  for (const c of cases) {
    try {
      const res = await sendWebhook(frontendUrl, c.event, c.auth);
      const ok = c.expect(res);
      if (!ok) failed++;
      console.log(`${ok ? '[OK]' : '[KO]'} ${c.label} : HTTP ${res.status} ${JSON.stringify(res.body)}`);
    } catch (err: any) {
      failed++;
      console.log(`[KO] ${c.label} : front injoignable (${err?.cause?.code ?? err?.message ?? err})`);
    }
  }
  console.log(`\n${failed === 0 ? 'Les 3 cas se comportent comme prévu.' : `${failed} cas en échec.`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
