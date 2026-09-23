// Strapi webhook -> Next.js cache revalidation.
//
// Strapi POSTs here for every subscribed event (see docs/webhooks/admin.md) with:
//   - the `X-Strapi-Event` header (e.g. entry.publish);
//   - `Authorization: Bearer <WEBHOOK_SECRET>`, set by webhooks.defaultHeaders in config/server.ts;
//   - a JSON body { event, createdAt, model, uid, entry }.
//
// Project contract: only entry.publish / entry.unpublish of the `article` model revalidate,
// and they revalidate exactly two tags: `articles` (list) and `article:<slug>` (detail).
// The slug is the one of the entry's locale (fr and en slugs differ).
import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

const HANDLED_EVENTS = new Set(['entry.publish', 'entry.unpublish']);
const HANDLED_MODEL = 'article';
const HANDLED_UID = 'api::article.article';

const LIST_TAG = 'articles';
const articleTag = (slug: string) => `article:${slug}`;

type StrapiWebhookPayload = {
  event?: string;
  model?: string;
  uid?: string;
  entry?: { title?: string; slug?: string; locale?: string; documentId?: string };
};

// Constant-time comparison on fixed-length SHA-256 digests (also hides the secret's length).
function isAuthorized(header: string | null, secret: string): boolean {
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  const received = createHash('sha256').update(header ?? '').digest();
  return timingSafeEqual(expected, received);
}

function log(message: string) {
  console.log(`[webhook] ${message}`);
}

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    log('refusé : WEBHOOK_SECRET absent de frontend/.env');
    return Response.json({ error: 'WEBHOOK_SECRET non configuré' }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get('authorization'), secret)) {
    log('refusé : header Authorization absent ou secret invalide (401)');
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let payload: StrapiWebhookPayload;
  try {
    payload = (await request.json()) as StrapiWebhookPayload;
  } catch {
    log('refusé : corps JSON illisible (400)');
    return Response.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  // X-Strapi-Event is authoritative; the body's `event` field is a fallback.
  const event = request.headers.get('x-strapi-event') ?? payload.event ?? 'inconnu';
  const model = payload.model ?? payload.uid ?? null;
  const entry = payload.entry ?? {};
  const label = `${event}${model ? ` ${model}` : ''}${entry.title ? ` "${entry.title}"` : ''}${entry.locale ? ` (${entry.locale})` : ''}`;

  const isArticle = payload.model === HANDLED_MODEL || payload.uid === HANDLED_UID;
  if (!HANDLED_EVENTS.has(event) || !isArticle) {
    log(`${label} -> ignoré (seuls entry.publish et entry.unpublish d'un article revalident)`);
    return Response.json({ revalidated: false, ignored: true, event, model });
  }

  const tags = [LIST_TAG];
  if (entry.slug) tags.push(articleTag(entry.slug));

  // updateTag is Server Actions only. `{ expire: 0 }` expires immediately: the next request
  // blocks on fresh data instead of being served stale content (see docs/handoff/webhooks.md).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  log(`${label} -> tags revalidés : ${tags.join(', ')}${entry.slug ? '' : ' (slug absent du payload)'}`);
  return Response.json({ revalidated: true, event, tags, now: Date.now() });
}
