import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-24">
      <p className="text-lg font-semibold text-indigo-700">Erreur 404</p>
      <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900">Article introuvable</h1>
      <p className="text-xl text-zinc-600">
        Cet article n&apos;existe pas ou n&apos;est pas encore publié. Un brouillon ne se voit qu&apos;en mode aperçu.
      </p>
      <Link href="/" className="text-lg font-semibold text-indigo-700 hover:underline">
        ← Retour aux articles
      </Link>
    </main>
  );
}
