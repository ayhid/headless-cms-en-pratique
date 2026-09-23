import type { Metadata } from "next";
import { ArticleListPage } from "@/components/articles/article-list-page";

export const metadata: Metadata = { title: "Articles en anglais" };

export default function HomeEn() {
  return <ArticleListPage locale="en" />;
}
