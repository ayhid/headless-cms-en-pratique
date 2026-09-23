// Shared helpers to simulate Strapi webhook calls against the Next.js revalidation route.
// Used by scripts/webhooks/simulate-publish.ts and scripts/checks/webhooks.ts.
//
// The payload mirrors the Strapi 5 envelope documented at
// https://docs.strapi.io/cms/backend-customization/webhooks (event, createdAt, model, uid, entry),
// and the request carries the `X-Strapi-Event` header, as Strapi does.

export type SimulatedEvent = 'entry.publish' | 'entry.unpublish' | 'entry.update';

export type SimulatedArticle = { documentId: string; title: string; slug: string; locale: string };

// Invented demo article, same slug as the seed (fr) so that a simulated publish revalidates a real page.
export const DEMO_ARTICLE: SimulatedArticle = {
  documentId: 'simulationwebhook0000000',
  title: 'Revalidation à la demande avec Next.js',
  slug: 'revalidation-a-la-demande',
  locale: 'fr',
};

export function frontendUrlFrom(env: Record<string, string | undefined>, fallback?: string): string {
  // Same precedence as scripts/demo-start.mts: FRONT_PORT (phase 2 worktrees) wins over FRONTEND_URL.
  if (env.FRONT_PORT) return `http://localhost:${env.FRONT_PORT}`;
  return (fallback ?? env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function buildPayload(event: SimulatedEvent, article: SimulatedArticle = DEMO_ARTICLE) {
  const now = new Date().toISOString();
  const published = event === 'entry.publish' || event === 'entry.unpublish';
  return {
    event,
    createdAt: now,
    model: 'article',
    uid: 'api::article.article',
    entry: {
      id: 999,
      documentId: article.documentId,
      title: article.title,
      slug: article.slug,
      excerpt: 'Payload simulé par scripts/webhooks, aucune donnée réelle.',
      locale: article.locale,
      createdAt: now,
      updatedAt: now,
      publishedAt: published ? now : null,
      publishAt: null,
      blocks: [],
      seo: null,
      cover: null,
      author: null,
      category: null,
      localizations: [],
    },
  };
}

export async function sendWebhook(
  frontendUrl: string,
  event: SimulatedEvent,
  authorization: string | null,
  article?: SimulatedArticle,
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Strapi-Event': event };
  if (authorization !== null) headers.Authorization = authorization;
  const res = await fetch(`${frontendUrl}/api/revalidate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildPayload(event, article)),
  });
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return { status: res.status, body };
}
