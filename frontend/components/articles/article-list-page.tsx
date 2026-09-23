/* eslint-disable @next/next/no-img-element -- images served by Strapi, whose port changes per environment */
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { articlePath, getArticles, homePath, mediaUrl, type Article, type Locale } from "@/lib/strapi";
import { ArticleMeta } from "./meta";
import { StrapiErrorPanel } from "./strapi-error-panel";

const HEADINGS: Record<Locale, { title: string; intro: string }> = {
  fr: { title: "Articles", intro: "Les articles publiés dans Strapi, servis par l'API REST et mis en cache par Next.js." },
  en: { title: "Articles en anglais", intro: "La version anglaise des mêmes contenus, grâce à l'i18n de Strapi." },
};

function ArticleCard({ article }: { article: Article }) {
  const cover = mediaUrl(article.cover, "medium");
  return (
    <li className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={articlePath(article.slug, article.locale)} className="flex h-full flex-col">
        {cover && (
          <img
            src={cover}
            alt={article.cover?.alternativeText ?? ""}
            width={article.cover?.formats?.medium?.width ?? article.cover?.width ?? undefined}
            height={article.cover?.formats?.medium?.height ?? article.cover?.height ?? undefined}
            className="aspect-[1200/630] w-full object-cover"
          />
        )}
        <div className="flex flex-1 flex-col gap-3 p-6">
          <h2 className="text-2xl font-bold leading-tight text-zinc-900 group-hover:text-indigo-700">{article.title}</h2>
          {article.excerpt && <p className="text-lg leading-relaxed text-zinc-700">{article.excerpt}</p>}
          <div className="mt-auto pt-2">
            <ArticleMeta article={article} />
          </div>
        </div>
      </Link>
    </li>
  );
}

export async function ArticleListPage({ locale }: { locale: Locale }) {
  // Rendered per request; Strapi data itself comes from the Data Cache (tag "articles")
  await connection();

  let articles: Article[] = [];
  let error: unknown = null;
  try {
    articles = await getArticles(locale);
  } catch (err) {
    unstable_rethrow(err);
    error = err;
  }

  const heading = HEADINGS[locale];
  return (
    <>
      <SiteHeader locale={locale} alternates={{ fr: homePath("fr"), en: homePath("en") }} />
      <main lang={locale} className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900">{heading.title}</h1>
        <p className="mt-4 max-w-3xl text-xl text-zinc-600">{heading.intro}</p>
        <div className="mt-10">
          {error ? (
            <StrapiErrorPanel error={error} />
          ) : articles.length === 0 ? (
            <p className="text-xl text-zinc-500">Aucun article publié pour le moment.</p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.documentId} article={article} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
