// Renders the `blocks` dynamic zone of an article: one server component per Strapi component,
// dispatched on `__component`. Contract with FRONT: `<Blocks blocks={article.blocks} />`.
import { GalleryBlock } from './gallery';
import { QuoteBlock } from './quote';
import { RichTextBlock } from './rich-text';
import type { GalleryBlock as GalleryData, QuoteBlock as QuoteData, RichTextBlock as RichTextData, StrapiBlock } from './types';

export type { StrapiBlock, StrapiMedia } from './types';
export { strapiMediaUrl } from './media';

function UnknownBlock({ block }: { block: StrapiBlock }) {
  // Discreet fallback: visible for editors in development, hidden in production.
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <p data-block="unknown" className="rounded border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-400 dark:border-zinc-700">
      Bloc non pris en charge par le front : <code>{block.__component}</code>
    </p>
  );
}

function renderBlock(block: StrapiBlock) {
  switch (block.__component) {
    case 'blocks.rich-text':
      return <RichTextBlock block={block as RichTextData} />;
    case 'blocks.quote':
      return <QuoteBlock block={block as QuoteData} />;
    case 'blocks.gallery':
      return <GalleryBlock block={block as GalleryData} />;
    default:
      return <UnknownBlock block={block} />;
  }
}

export function Blocks({ blocks }: { blocks?: StrapiBlock[] | null }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block, index) => (
        <section key={`${block.__component}-${block.id ?? index}`}>{renderBlock(block)}</section>
      ))}
    </div>
  );
}

export default Blocks;
