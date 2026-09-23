// Contrôles CONTENU : components, article composé publié en fr et en, populate du contrat FRONT.
import type { CheckFn, CheckResult } from './types';

const COMPONENTS = ['blocks.rich-text', 'blocks.quote', 'blocks.gallery', 'shared.seo'];
const BLOCK_TYPES = ['blocks.rich-text', 'blocks.quote', 'blocks.gallery'];
const SLUGS = { fr: 'composer-un-article-bloc-par-bloc', en: 'composing-an-article-block-by-block' } as const;

// Populate exact utilisé par FRONT (voir docs/handoff/contenu.md).
export const CONTRACT_POPULATE =
  'populate[blocks][populate]=*&populate[cover]=true&populate[author]=true&populate[category]=true&populate[seo][populate]=*';

const check: CheckFn = async (ctx) => {
  const results: CheckResult[] = [];

  const jwt = await ctx.adminJwt();
  const comps = await ctx.fetchJson('/content-type-builder/components', { token: jwt });
  const uids: string[] = (comps.body?.data ?? []).map((c: any) => c.uid);
  const missing = COMPONENTS.filter((uid) => !uids.includes(uid));
  results.push({
    ok: comps.status === 200 && missing.length === 0,
    message:
      missing.length === 0
        ? `Components présents : ${COMPONENTS.join(', ')}`
        : `Components manquants : ${missing.join(', ')} (HTTP ${comps.status})`,
  });

  for (const locale of ['fr', 'en'] as const) {
    const res = await ctx.fetchJson(
      `/api/articles?filters[slug][$eq]=${SLUGS[locale]}&locale=${locale}&${CONTRACT_POPULATE}`,
      { token: ctx.env.STRAPI_READ_TOKEN },
    );
    const article = res.body?.data?.[0];
    if (!article) {
      results.push({ ok: false, message: `Article composé "${SLUGS[locale]}" introuvable ou non publié en ${locale} (HTTP ${res.status}) : export à régénérer ? voir docs/handoff/contenu.md` });
      continue;
    }
    const blocks: any[] = article.blocks ?? [];
    const types = new Set(blocks.map((b) => b.__component));
    const gallery = blocks.find((b) => b.__component === 'blocks.gallery');
    const images = (gallery?.images ?? []).filter((i: any) => typeof i?.url === 'string');
    const quote = blocks.find((b) => b.__component === 'blocks.quote');
    const ok =
      Boolean(article.publishedAt) &&
      BLOCK_TYPES.every((t) => types.has(t)) &&
      images.length > 0 &&
      Boolean(quote?.text) &&
      Boolean(article.seo?.metaTitle) &&
      Boolean(article.cover?.url);
    results.push({
      ok,
      message: `Article composé publié en ${locale} : ${blocks.length} bloc(s) (${[...types].join(', ')}), ${images.length} image(s) de galerie, SEO ${article.seo?.metaTitle ? 'rempli' : 'vide'} (populate du contrat FRONT)`,
    });
  }

  return results;
};

export default check;
