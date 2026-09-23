import type { Metadata } from "next";
import "./globals.css";

// Polices systeme : aucun telechargement externe (Google Fonts) le jour de la demo.
export const metadata: Metadata = {
  title: "Blog de demo Strapi",
  description: "Front Next.js de la demo \"Headless CMS en pratique : Strapi au-dela du simple CMS\"",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
