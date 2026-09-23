// Server-side Strapi client (never imported by a Client Component: the tokens stay on the server).
//
// Cache contract (shared with WEBHOOKS, see docs/handoff/front.md):
//   - list of articles  -> tag "articles"
//   - article detail    -> tag "article:<slug>"
// Published reads use the Next.js Data Cache (`cache: 'force-cache'` + `next.tags`) with STRAPI_READ_TOKEN.
// When Draft Mode is on, reads use STRAPI_PREVIEW_TOKEN + `status=draft` and bypass every cache.
// Server-only by construction: `next/headers` cannot be bundled in a Client Component, and the tokens
// have no NEXT_PUBLIC_ prefix, so Next.js never inlines them in the browser bundle.
import { draftMode } from "next/headers";
import type { StrapiBlock } from "@/components/blocks";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export const ARTICLES_TAG = "articles";
export const articleTag = (slug: string) => `article:${slug}`;

// ---------------------------------------------------------------------------
// Types (only the fields the front uses)
// ---------------------------------------------------------------------------
export type StrapiMedia = {
  id: number;
  documentId: string;
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
  formats?: Record<string, { url: string; width: number; height: number }> | null;
};

export type StrapiSeo = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  shareImage?: StrapiMedia | null;
};

export type Article = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  locale: Locale;
  publishedAt: string | null;
  updatedAt: string;
  cover: StrapiMedia | null;
  author: { name: string; bio?: string | null } | null;
  category: { name: string; slug: string } | null;
  blocks: StrapiBlock[] | null;
  seo: StrapiSeo | null;
  localizations?: { slug: string; locale: Locale }[];
};

type StrapiList<T> = {
  data: T[];
  meta: { pagination?: { total: number } };
};

// ---------------------------------------------------------------------------
// Errors: readable French messages, never the token
// ---------------------------------------------------------------------------
export class StrapiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "StrapiError";
  }
}

export function strapiUrl() {
  return (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
}

/** Absolute URL of a Strapi upload (the local provider returns "/uploads/...") */
export function mediaUrl(media?: StrapiMedia | null, format?: string) {
  const url = (format && media?.formats?.[format]?.url) || media?.url;
  if (!url) return null;
  return url.startsWith("http") ? url : `${strapiUrl()}${url}`;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Low-level fetch
// ---------------------------------------------------------------------------
type FetchOptions = { tags: string[]; draft: boolean };

async function strapiFetch<T>(path: string, params: URLSearchParams, { tags, draft }: FetchOptions): Promise<T> {
  const token = draft ? process.env.STRAPI_PREVIEW_TOKEN : process.env.STRAPI_READ_TOKEN;
  const tokenName = draft ? "STRAPI_PREVIEW_TOKEN" : "STRAPI_READ_TOKEN";
  if (!token) {
    throw new StrapiError(`Variable ${tokenName} absente : la renseigner dans frontend/.env`);
  }
  if (draft) params.set("status", "draft");
  const url = `${strapiUrl()}${path}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // Draft Mode bypasses the Data Cache anyway; "no-store" makes the intent explicit.
      ...(draft ? { cache: "no-store" as const } : { cache: "force-cache" as const, next: { tags } }),
    });
  } catch {
    throw new StrapiError(`Strapi est injoignable sur ${strapiUrl()} : lancer npm run demo:start`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new StrapiError(
      `Strapi refuse l'accès (HTTP ${res.status}) : vérifier ${tokenName} dans frontend/.env`,
      res.status,
    );
  }
  if (!res.ok) {
    throw new StrapiError(`Strapi a répondu HTTP ${res.status} sur ${path}`, res.status);
  }
  return (await res.json()) as T;
}

// Populate contract (fixed with CONTENU and WEBHOOKS)
function populateParams() {
  const params = new URLSearchParams();
  params.set("populate[blocks][populate]", "*");
  params.set("populate[cover]", "true");
  params.set("populate[author]", "true");
  params.set("populate[category]", "true");
  params.set("populate[seo][populate]", "*");
  // Only for the language switch: slug of the other locale
  params.set("populate[localizations][fields][0]", "slug");
  params.set("populate[localizations][fields][1]", "locale");
  return params;
}

async function isDraft() {
  return (await draftMode()).isEnabled;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function getArticles(locale: Locale = DEFAULT_LOCALE) {
  const params = new URLSearchParams();
  params.set("locale", locale);
  params.set("sort[0]", "publishedAt:desc");
  params.set("sort[1]", "updatedAt:desc");
  params.set("pagination[pageSize]", "50");
  params.set("populate[cover]", "true");
  params.set("populate[author]", "true");
  params.set("populate[category]", "true");
  const body = await strapiFetch<StrapiList<Article>>("/api/articles", params, {
    tags: [ARTICLES_TAG],
    draft: await isDraft(),
  });
  return body.data;
}

export async function getArticle(slug: string, locale: Locale = DEFAULT_LOCALE) {
  const params = populateParams();
  params.set("locale", locale);
  params.set("filters[slug][$eq]", slug);
  const body = await strapiFetch<StrapiList<Article>>("/api/articles", params, {
    tags: [articleTag(slug)],
    draft: await isDraft(),
  });
  return body.data[0] ?? null;
}

/** Used by /api/preview: always reads the draft version, never cached */
export async function findArticleForPreview(slug: string, locale: Locale) {
  const params = new URLSearchParams();
  params.set("locale", locale);
  params.set("filters[slug][$eq]", slug);
  params.set("fields[0]", "slug");
  const body = await strapiFetch<StrapiList<Pick<Article, "slug">>>("/api/articles", params, {
    tags: [],
    draft: true,
  });
  return body.data[0] ?? null;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
export function homePath(locale: Locale) {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
}

export function articlePath(slug: string, locale: Locale) {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  return `${prefix}/articles/${encodeURIComponent(slug)}`;
}
