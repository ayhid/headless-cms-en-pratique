import { ArticleDetailPage, articleMetadata } from "@/components/articles/article-detail-page";

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  return articleMetadata(slug, "fr");
}

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  return <ArticleDetailPage slug={slug} locale="fr" />;
}
