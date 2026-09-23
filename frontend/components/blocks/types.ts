// Shapes of the `blocks` dynamic zone items as returned by the Strapi REST API
// with `populate[blocks][populate]=*` (see docs/handoff/contenu.md).

export type StrapiMedia = {
  id: number;
  documentId?: string;
  url: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, { url: string; width: number; height: number }> | null;
};

/** Node of the Strapi 5 "blocks" rich text format. */
export type RichTextNode = {
  type: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  level?: number;
  format?: 'ordered' | 'unordered';
  url?: string;
  language?: string;
  image?: StrapiMedia;
  children?: RichTextNode[];
};

export type RichTextBlock = { __component: 'blocks.rich-text'; id: number; body: RichTextNode[] | null };

export type QuoteBlock = {
  __component: 'blocks.quote';
  id: number;
  text: string;
  author: string;
  role?: string | null;
};

export type GalleryBlock = {
  __component: 'blocks.gallery';
  id: number;
  images: StrapiMedia[] | null;
  caption?: string | null;
};

/** Any item of the dynamic zone; unknown components keep at least `__component`. */
export type StrapiBlock =
  | RichTextBlock
  | QuoteBlock
  | GalleryBlock
  | { __component: string; id?: number; [key: string]: unknown };
