// Controles de l'agent FRONT (front Next.js lance : npm run demo:start, ou next start).
// - la page d'accueil repond 200 et affiche les titres des articles fr publies (lus dans Strapi) ;
// - une page de detail repond 200 ;
// - /api/preview active le Draft Mode et le brouillon s'affiche avec le bandeau ; sans aperçu : 404.
import type { CheckFn, CheckResult } from './types';

const DRAFT_SLUG = 'brouillon-plugin-maison';

function decodeHtml(html: string) {
  return html
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function getPage(url: string, cookie?: string) {
  const res = await fetch(url, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
  return { status: res.status, html: decodeHtml(await res.text()), headers: res.headers };
}

const check: CheckFn = async (ctx) => {
  const front = ctx.frontendUrl.replace(/\/$/, '');
  const results: CheckResult[] = [];

  // 1. Home + fr titles
  let home: Awaited<ReturnType<typeof getPage>>;
  try {
    home = await getPage(`${front}/`);
  } catch {
    return [{ ok: false, message: `Front injoignable sur ${front} : lancer npm run demo:start` }];
  }
  const api = await ctx.fetchJson('/api/articles?locale=fr&fields[0]=title&fields[1]=slug&pagination[pageSize]=50', {
    token: ctx.env.STRAPI_READ_TOKEN,
  });
  const published: { title: string; slug: string }[] = api.body?.data ?? [];
  const missing = published.filter((a) => !home.html.includes(a.title));
  results.push({ ok: home.status === 200, message: `Front ${front}/ : HTTP ${home.status}` });
  results.push({
    ok: published.length >= 5 && missing.length === 0,
    message:
      missing.length === 0
        ? `Liste fr : ${published.length} titre(s) publié(s) affiché(s)`
        : `Liste fr : titre(s) absent(s) : ${missing.map((a) => a.title).join(', ')}`,
  });

  // 2. Detail page
  if (published[0]) {
    const detail = await getPage(`${front}/articles/${published[0].slug}`);
    results.push({
      ok: detail.status === 200 && detail.html.includes(published[0].title),
      message: `Détail /articles/${published[0].slug} : HTTP ${detail.status}`,
    });
  }

  // 3. Preview of the draft
  const secret = ctx.env.PREVIEW_SECRET ?? '';
  const withoutPreview = await getPage(`${front}/articles/${DRAFT_SLUG}`);
  const enter = await getPage(
    `${front}/api/preview?secret=${encodeURIComponent(secret)}&slug=${DRAFT_SLUG}&locale=fr&status=draft`,
  );
  const cookie = (enter.headers.get('set-cookie') ?? '').match(/__prerender_bypass=[^;]+/)?.[0];
  const draft = cookie ? await getPage(`${front}/articles/${DRAFT_SLUG}`, cookie) : null;
  const badSecret = await getPage(`${front}/api/preview?secret=mauvais&slug=${DRAFT_SLUG}`);
  const ok =
    withoutPreview.status === 404 &&
    enter.status === 307 &&
    !!draft &&
    draft.status === 200 &&
    draft.html.includes('Mode aperçu : brouillon') &&
    badSecret.status === 401;
  results.push({
    ok,
    message: `Aperçu du brouillon ${DRAFT_SLUG} : sans aperçu HTTP ${withoutPreview.status}, /api/preview HTTP ${enter.status}${
      cookie ? ' + cookie' : ' sans cookie'
    }, avec aperçu HTTP ${draft?.status ?? '-'}${draft?.html.includes('Mode aperçu : brouillon') ? ' + bandeau' : ''}, mauvais secret HTTP ${badSecret.status}`,
  });

  return results;
};

export default check;
