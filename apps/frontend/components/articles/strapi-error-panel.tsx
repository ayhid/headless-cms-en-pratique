import { StrapiError } from "@/lib/strapi";

/** Readable on screen during the demo: what failed and how to fix it (never the token) */
export function StrapiErrorPanel({ error }: { error: unknown }) {
  const message = error instanceof StrapiError ? error.message : "Erreur inattendue en lisant Strapi";
  console.error("[front] lecture Strapi impossible :", error);
  return (
    <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-6 text-lg text-red-900">
      <p className="text-xl font-bold">Impossible de charger les articles</p>
      <p className="mt-2">{message}</p>
    </div>
  );
}
