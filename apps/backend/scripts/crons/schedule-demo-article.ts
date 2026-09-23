// Prepares, in one command, the live demo of the scheduled publication cron:
// creates (as the demo admin, through the Content Manager admin API) a French DRAFT article
// whose publishAt is "now + N seconds", then waits until the cron publishes it and the
// public API (STRAPI_READ_TOKEN) returns it.
//
//   npm run demo:start                       (DEMO_MODE=true, cron every 30 s)
//   npx tsx scripts/crons/schedule-demo-article.ts            # publishAt = now + 20 s
//   npx tsx scripts/crons/schedule-demo-article.ts 45         # publishAt = now + 45 s
//   npx tsx scripts/crons/schedule-demo-article.ts --no-wait  # create only
import { loadEnv } from '../lib/env';

const env = loadEnv();
const strapiUrl = env.STRAPI_URL || `http://localhost:${env.PORT || 1337}`;
const args = process.argv.slice(2);
const delaySeconds = Number(args.find((a) => /^\d+$/.test(a)) ?? 20);
const wait = !args.includes('--no-wait');
const UID = 'api::article.article';

const timeFr = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', timeStyle: 'medium' });
const log = (msg: string) => console.log(`[demo cron ${timeFr.format(new Date())}] ${msg}`);

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${strapiUrl}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  return { status: res.status, body };
}

async function main() {
  const login = await call('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: env.DEMO_ADMIN_EMAIL, password: env.DEMO_ADMIN_PASSWORD }),
  }).catch(() => null);
  const jwt = login?.body?.data?.token;
  if (!jwt) {
    console.error(`Connexion admin impossible sur ${strapiUrl} (Strapi est-il lancé ? identifiants de .env ?)`);
    process.exit(1);
  }

  const authors = await call(`/content-manager/collection-types/api::author.author?pageSize=1`, { token: jwt });
  const author = authors.body?.results?.[0];
  // Reuse an image of the media library as cover (the front and demo:check expect one)
  const files = await call(`/upload/files?pageSize=50&sort=id:asc`, { token: jwt });
  const images: any[] = (files.body?.results ?? files.body ?? []).filter((f: any) => f.mime?.startsWith('image/'));
  const cover = images.find((f) => /cover/i.test(f.name)) ?? images[0];

  const publishAt = new Date(Date.now() + delaySeconds * 1000);
  const stamp = publishAt.getTime().toString(36);
  const title = `Parution programmée en direct (${timeFr.format(publishAt)})`;
  const created = await call(`/content-manager/collection-types/${UID}?locale=fr`, {
    method: 'POST',
    token: jwt,
    body: JSON.stringify({
      title,
      slug: `parution-programmee-${stamp}`,
      excerpt: "Brouillon créé pendant le talk : le cron le publie tout seul à l'heure prévue.",
      publishAt: publishAt.toISOString(),
      ...(author ? { author: { connect: [{ documentId: author.documentId }] } } : {}),
      ...(cover ? { cover: cover.id } : {}),
    }),
  });
  const doc = created.body?.data;
  if (created.status >= 300 || !doc?.documentId) {
    console.error(`Création refusée (HTTP ${created.status}) : ${JSON.stringify(created.body)}`);
    process.exit(1);
  }
  log(`Brouillon fr créé : « ${title} » (documentId ${doc.documentId}), statut : brouillon`);
  log(`Parution prévue à ${timeFr.format(publishAt)}${author ? `, auteur : ${author.name}` : ''}`);
  if (!wait) return;

  log('Attente de la publication par le cron (aucune action manuelle)...');
  const deadline = Date.now() + (delaySeconds + 90) * 1000;
  while (Date.now() < deadline) {
    const res = await call(
      `/api/articles?locale=fr&filters[documentId][$eq]=${doc.documentId}&fields[0]=title&fields[1]=publishedAt`,
      { token: env.STRAPI_READ_TOKEN },
    );
    const live = res.body?.data?.[0];
    if (live) {
      log(`Publié ! GET /api/articles?locale=fr le renvoie (publishedAt ${live.publishedAt})`);
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error('Toujours pas publié : le cron est-il activé (config/server.ts) et DEMO_MODE=true ?');
  process.exit(1);
}

main();
