// Server component for the blocks.quote component.
import type { QuoteBlock as QuoteBlockData } from './types';

export function QuoteBlock({ block }: { block: QuoteBlockData }) {
  if (!block.text) return null;
  return (
    <figure data-block="blocks.quote" className="my-2 rounded-2xl border-l-4 border-indigo-500 bg-indigo-50 px-6 py-5 dark:bg-indigo-950/40">
      <blockquote className="text-xl font-medium leading-8 text-zinc-900 dark:text-zinc-100">
        <p>&laquo;&nbsp;{block.text}&nbsp;&raquo;</p>
      </blockquote>
      {block.author ? (
        <figcaption className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{block.author}</span>
          {block.role ? <span>, {block.role}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
