import type { Metadata } from "next";
import { PreviewBanner } from "@/components/preview-banner";
import "./globals.css";

// Polices systeme : aucun telechargement externe (Google Fonts) le jour de la demo.
export const metadata: Metadata = {
  title: { default: "Blog de démo Strapi", template: "%s | Blog de démo Strapi" },
  description: "Front Next.js de la démo « Headless CMS en pratique : Strapi au-delà du simple CMS »",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <PreviewBanner />
        {children}
      </body>
    </html>
  );
}
