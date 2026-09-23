// WEBHOOKS checks: the Next.js route /api/revalidate must
//   - answer 401 without the secret,
//   - answer 200 and revalidate on a simulated entry.publish of an article,
//   - answer 200 and ignore an entry.update.
// It needs the front to be running (npm run demo:start).
import type { CheckFn, CheckResult } from './types';
import { frontendUrlFrom, sendWebhook } from '../webhooks/lib';

const check: CheckFn = async (ctx) => {
  const frontendUrl = frontendUrlFrom(ctx.env, ctx.frontendUrl);
  const route = `${frontendUrl}/api/revalidate`;
  const secret = ctx.env.WEBHOOK_SECRET;
  if (!secret) return { ok: false, message: 'WEBHOOK_SECRET absent du .env racine' };

  try {
    await fetch(frontendUrl, { method: 'HEAD' });
  } catch {
    return { ok: false, message: `Front injoignable sur ${frontendUrl} : lancer npm run demo:start` };
  }

  const results: CheckResult[] = [];

  const noSecret = await sendWebhook(frontendUrl, 'entry.publish', null);
  results.push({
    ok: noSecret.status === 401,
    message: `${route} sans secret : HTTP ${noSecret.status} (401 attendu)`,
  });

  const publish = await sendWebhook(frontendUrl, 'entry.publish', `Bearer ${secret}`);
  const tags: string[] = publish.body?.tags ?? [];
  results.push({
    ok: publish.status === 200 && publish.body?.revalidated === true && tags.includes('articles') && tags.some((t) => t.startsWith('article:')),
    message: `Publication simulée d'un article : HTTP ${publish.status}, tags revalidés : ${tags.join(', ') || 'aucun'}`,
  });

  const update = await sendWebhook(frontendUrl, 'entry.update', `Bearer ${secret}`);
  results.push({
    ok: update.status === 200 && update.body?.ignored === true && update.body?.revalidated === false,
    message: `entry.update simulé : HTTP ${update.status}, ${update.body?.ignored ? 'ignoré, rien de revalidé' : 'NON ignoré'}`,
  });

  return results;
};

export default check;
