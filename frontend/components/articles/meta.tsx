import type { Article, Locale } from "@/lib/strapi";

const DATE_LOCALES: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

export function formatDate(iso: string | null, locale: Locale) {
  if (!iso) return null;
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], { dateStyle: "long", timeZone: "Europe/Paris" }).format(
    new Date(iso),
  );
}

/** Author, category, date, and a "Brouillon" badge for a draft never published */
export function ArticleMeta({ article, size = "base" }: { article: Article; size?: "base" | "lg" }) {
  const date = formatDate(article.publishedAt, article.locale);
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-zinc-600 ${size === "lg" ? "text-lg" : "text-base"}`}>
      {article.category && (
        <span className="rounded-full bg-indigo-50 px-3 py-0.5 font-semibold text-indigo-700">{article.category.name}</span>
      )}
      {article.author && <span>par {article.author.name}</span>}
      {date ? (
        <time dateTime={article.publishedAt ?? undefined}>{date}</time>
      ) : (
        <span className="rounded-full bg-amber-100 px-3 py-0.5 font-semibold text-amber-800">Brouillon</span>
      )}
    </div>
  );
}
