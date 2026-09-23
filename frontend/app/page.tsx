// Page d'accueil minimale posee par le SOCLE. L'agent FRONT y branchera la liste des articles
// (fetch Strapi avec STRAPI_READ_TOKEN, tag de cache "articles").
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Blog de demo Strapi</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Front Next.js de la demo &laquo; Headless CMS en pratique : Strapi au-dela du simple CMS &raquo;.
      </p>
      <p className="text-zinc-500">Les articles publies dans Strapi apparaitront ici.</p>
    </main>
  );
}
