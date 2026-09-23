// STUB pose par le SOCLE : contrat `Blocks({ blocks })`, remplace par l'agent CONTENU.
// `blocks` est la dynamic zone `blocks` d'un article Strapi (chaque element a un `__component`).

export type StrapiBlock = { __component: string; id?: number; [key: string]: unknown };

export function Blocks({ blocks }: { blocks?: StrapiBlock[] | null }) {
  if (!blocks || blocks.length === 0) {
    return <p className="text-zinc-500">Aucun bloc.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <section key={`${block.__component}-${block.id ?? index}`} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="mb-2 font-mono text-sm text-zinc-500">{block.__component}</p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-sm">{JSON.stringify(block, null, 2)}</pre>
        </section>
      ))}
    </div>
  );
}

export default Blocks;
