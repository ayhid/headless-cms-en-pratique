"use client";

import { usePathname } from "next/navigation";

// Plain <a> (not next/link): a prefetch of the disable route would drop the Draft Mode cookie.
export function ExitPreviewLink() {
  const pathname = usePathname() || "/";
  return (
    <a
      href={`/api/preview/disable?redirect=${encodeURIComponent(pathname)}`}
      className="rounded-md bg-zinc-900 px-4 py-1.5 text-base text-white hover:bg-zinc-700"
    >
      Quitter l&apos;aperçu
    </a>
  );
}
