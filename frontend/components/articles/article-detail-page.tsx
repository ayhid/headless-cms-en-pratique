/* eslint-disable @next/next/no-img-element -- images served by Strapi, whose port changes per environment */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Blocks } from "@/components/blocks";
import { SiteHeader } from "@/components/site-header";
import {
  articlePath,
  getArticle,
  homePath,
  mediaUrl,
  StrapiError,
  type Article,
  type Locale,
} from "@/lib/strapi";
import { ArticleMeta } from "./meta";
import { StrapiErrorPanel } from "./strapi-error-panel";

function alternatesOf(article: Article): Record<Locale, string> {
  const result: Record<Locale, string> = { fr: homePath("fr"), en: homePath("en") };
  result[article.locale] = articlePath(article.slug, article.locale);
  for (const loc of article.localizations ?? []) {
    result[loc.locale] = articlePath(loc.slug, loc.locale);
  }
  return result;
}

/** SEO from the shared.seo component, falling back on title / excerpt / cover */
export async function articleMetadata(slug: string, locale: Locale): Promise<Metadata> {
  let article: Article | null = null;
  try {
    article = await getArticle(slug, locale);
  } catch (err) {
    unstable_rethrow(err);
    return { title: "Strapi indisponible" };
  }
  if (!article) return { title: "Article introuvable" };

  const title = article.seo?.metaTitle || article.title;
  const description = article.seo?.metaDescription || article.excerpt || undefined;
  const image = mediaUrl(article.seo?.shareImage) || mediaUrl(article.cover);
  const languages = Object.fromEntries(
    (article.localizations ?? []).map((loc) => [loc.locale, articlePath(loc.slug, loc.locale)]),
  );
  return {
    title,
    description,
    alternates: { canonical: articlePath(article.slug, article.locale), languages },
    openGraph: {
      type: "article",
      title,
      description,
      locale: article.locale === "fr" ? "fr_FR" : "en_GB",
      publishedTime: article.publishedAt ?? undefined,
      authors: article.author ? [article.author.name] : undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export async function ArticleDetailPage({ slug, locale }: { slug: string; locale: Locale }) {
  // Rendered per request; Strapi data itself comes from the Data Cache (tag "article:<slug>")
  await connection();

  let article: Article | null = null;
  let error: unknown = null;
  try {
    article = await getArticle(slug, locale);
  } catch (err) {
    unstable_rethrow(err);
    if (!(err instanceof StrapiError)) throw err;
    error = err;
  }
  if (!error && !article) notFound();

  const cover = article ? mediaUrl(article.cover, "large") : null;
  return (
    <>
      <SiteHeader locale={locale} alternates={article ? alternatesOf(article) : { fr: homePath("fr"), en: homePath("en") }} />
      <main lang={locale} className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link href={homePath(locale)} className="text-lg font-semibold text-indigo-700 hover:underline">
          ← Tous les articles
        </Link>
        {error || !article ? (
          <div className="mt-8">
            <StrapiErrorPanel error={error} />
          </div>
        ) : (
          <article className="mt-8">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-zinc-900">{article.title}</h1>
            <div className="mt-6">
              <ArticleMeta article={article} size="lg" />
            </div>
            {article.excerpt && <p className="mt-6 text-2xl leading-relaxed text-zinc-700">{article.excerpt}</p>}
            {cover && (
              <img
                src={cover}
                alt={article.cover?.alternativeText ?? ""}
                width={article.cover?.formats?.large?.width ?? article.cover?.width ?? undefined}
                height={article.cover?.formats?.large?.height ?? article.cover?.height ?? undefined}
                className="mt-10 aspect-[1200/630] w-full rounded-2xl object-cover"
              />
            )}
            <div className="mt-10 text-xl leading-relaxed text-zinc-800">
              <Blocks blocks={article.blocks} />
            </div>
            {article.author && (
              <footer className="mt-14 rounded-2xl bg-zinc-50 p-6">
                <p className="text-lg font-bold text-zinc-900">{article.author.name}</p>
                {article.author.bio && <p className="mt-1 text-lg text-zinc-600">{article.author.bio}</p>}
              </footer>
            )}
          </article>
        )}
      </main>
    </>
  );
}
