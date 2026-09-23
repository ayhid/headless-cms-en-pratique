// Server component for the blocks.gallery component (multiple images + caption).
import { strapiMediaUrl } from './media';
import type { GalleryBlock as GalleryBlockData, StrapiMedia } from './types';

/** Picks a reasonably sized rendition when Strapi generated responsive formats. */
function bestUrl(image: StrapiMedia) {
  return image.formats?.medium?.url ?? image.formats?.small?.url ?? image.url;
}

export function GalleryBlock({ block }: { block: GalleryBlockData }) {
  const images = (block.images ?? []).filter((image) => image?.url);
  if (images.length === 0) return null;
  const columns = images.length === 1 ? 'sm:grid-cols-1' : images.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  return (
    <figure data-block="blocks.gallery" className="flex flex-col gap-3">
      <div className={`grid grid-cols-1 gap-3 ${columns}`}>
        {images.map((image) => (
          // eslint-disable-next-line @next/next/no-img-element -- Strapi origin varies per environment (port), see media.ts
          <img
            key={image.id}
            src={strapiMediaUrl(bestUrl(image)) ?? ''}
            alt={image.alternativeText ?? ''}
            width={image.width ?? undefined}
            height={image.height ?? undefined}
            loading="lazy"
            className="aspect-video h-auto w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800"
          />
        ))}
      </div>
      {block.caption ? (
        <figcaption className="text-center text-sm text-zinc-500 dark:text-zinc-400">{block.caption}</figcaption>
      ) : null}
    </figure>
  );
}
