import { ArticleDetailPage, articleMetadata } from "@/components/articles/article-detail-page";

export async function generateMetadata({ params }: PageProps<"/en/articles/[slug]">) {
  const { slug } = await params;
  return articleMetadata(slug, "en");
}

export default async function ArticlePageEn({ params }: PageProps<"/en/articles/[slug]">) {
  const { slug } = await params;
  return <ArticleDetailPage slug={slug} locale="en" />;
}
