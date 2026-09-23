import Link from "next/link";
import { homePath, type Locale } from "@/lib/strapi";

type Props = {
  locale: Locale;
  /** Same page in the other locale (falls back to the other locale's home) */
  alternates: Record<Locale, string>;
};

const LABELS: Record<Locale, { short: string; long: string }> = {
  fr: { short: "FR", long: "Français" },
  en: { short: "EN", long: "Anglais" },
};

export function SiteHeader({ locale, alternates }: Props) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-5">
        <Link href={homePath(locale)} className="text-2xl font-bold tracking-tight text-zinc-900">
          Blog de démo Strapi
        </Link>
        <nav aria-label="Langue" className="flex items-center gap-1 rounded-full border border-zinc-300 p-1 text-base font-semibold">
          {(Object.keys(LABELS) as Locale[]).map((l) =>
            l === locale ? (
              <span key={l} aria-current="true" title={LABELS[l].long} className="rounded-full bg-zinc-900 px-4 py-1 text-white">
                {LABELS[l].short}
              </span>
            ) : (
              <Link
                key={l}
                href={alternates[l]}
                hrefLang={l}
                title={`Lire en ${LABELS[l].long.toLowerCase()}`}
                className="rounded-full px-4 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                {LABELS[l].short}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
