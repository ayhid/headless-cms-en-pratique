// Seed CONTENU : un article de démo qui compose les 3 blocs de la dynamic zone
// (blocks.rich-text + blocks.quote + blocks.gallery) et le component shared.seo,
// publié en fr et en. Uniquement via le Document Service et le service upload.
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { ASSETS_DIR, type SeedFn } from './lib/helpers';

const ARTICLE = 'api::article.article';
const AUTHOR = 'api::author.author';
const CATEGORY = 'api::category.category';

export const COMPOSED_SLUG = { fr: 'composer-un-article-bloc-par-bloc', en: 'composing-an-article-block-by-block' };

type Locale = 'fr' | 'en';

const text = (value: string, marks: Record<string, boolean> = {}) => ({ type: 'text', text: value, ...marks });

const CONTENT = {
  fr: {
    title: 'Composer un article bloc par bloc',
    excerpt: 'Texte riche, citation et galerie : une seule zone dynamique, trois blocs, un rendu Next.js.',
    heading: 'Une page, plusieurs blocs',
    intro:
      "Avec une zone dynamique, la rédaction choisit l'ordre et le type de chaque bloc. Le front ne connaît qu'un contrat : un tableau de blocs, chacun identifié par son champ ",
    listIntro: 'Cet article en contient trois :',
    items: [
      'un bloc de texte riche, écrit dans l\'éditeur de Strapi ;',
      'une citation, avec son auteur et son rôle ;',
      'une galerie de trois images, avec une légende.',
    ],
    linkBefore: 'Les détails sont dans la ',
    linkLabel: 'documentation du Content-type Builder',
    quote: 'Le bon modèle de contenu, c\'est celui que la rédaction comprend sans lire la documentation.',
    quoteAuthor: 'Léa Fontaine',
    quoteRole: 'Directrice éditoriale chez Studio Méridien (société fictive)',
    caption: 'Trois visuels générés pour la démo, affichés en grille.',
    alt: ['Visuel de démo numéro 1', 'Visuel de démo numéro 2', 'Visuel de démo numéro 3'],
    metaTitle: 'Composer un article bloc par bloc avec Strapi',
    metaDescription: 'Exemple de zone dynamique Strapi 5 : texte riche, citation et galerie rendus par Next.js.',
  },
  en: {
    title: 'Composing an article block by block',
    excerpt: 'Rich text, quote and gallery: one dynamic zone, three blocks, one Next.js rendering.',
    heading: 'One page, many blocks',
    intro:
      'With a dynamic zone, editors choose the order and the type of every block. The front end only knows one contract: an array of blocks, each identified by its ',
    listIntro: 'This article contains three of them:',
    items: [
      'a rich text block, written in the Strapi editor;',
      'a quote, with its author and role;',
      'a gallery of three images, with a caption.',
    ],
    linkBefore: 'Details are in the ',
    linkLabel: 'Content-type Builder documentation',
    quote: 'The right content model is the one editors understand without reading the docs.',
    quoteAuthor: 'Léa Fontaine',
    quoteRole: 'Editorial director at Studio Méridien (fictional company)',
    caption: 'Three visuals generated for the demo, displayed as a grid.',
    alt: ['Demo visual number 1', 'Demo visual number 2', 'Demo visual number 3'],
    metaTitle: 'Composing an article block by block with Strapi',
    metaDescription: 'Strapi 5 dynamic zone example: rich text, quote and gallery rendered by Next.js.',
  },
};

function blocksFor(locale: Locale, galleryIds: number[]) {
  const c = CONTENT[locale];
  return [
    {
      __component: 'blocks.rich-text',
      body: [
        { type: 'heading', level: 2, children: [text(c.heading)] },
        { type: 'paragraph', children: [text(c.intro), text('__component', { code: true }), text('.')] },
        { type: 'paragraph', children: [text(c.listIntro, { bold: true })] },
        {
          type: 'list',
          format: 'unordered',
          children: c.items.map((item) => ({ type: 'list-item', children: [text(item)] })),
        },
        {
          type: 'paragraph',
          children: [
            text(c.linkBefore),
            {
              type: 'link',
              url: 'https://docs.strapi.io/cms/features/content-type-builder',
              children: [text(c.linkLabel)],
            },
            text('.'),
          ],
        },
      ],
    },
    { __component: 'blocks.quote', text: c.quote, author: c.quoteAuthor, role: c.quoteRole },
    { __component: 'blocks.gallery', images: galleryIds, caption: c.caption },
  ];
}

const seed: SeedFn = async ({ strapi, helpers }) => {
  const existing = await strapi.documents(ARTICLE).findFirst({ locale: 'fr', filters: { slug: COMPOSED_SLUG.fr } });
  if (existing) {
    console.log('  article composé déjà présent, rien à faire');
    return;
  }

  const author = await strapi.documents(AUTHOR).findFirst({ filters: { name: 'Ines Carvalho' } });
  const category = await strapi.documents(CATEGORY).findFirst({ locale: 'fr', filters: { slug: 'editorial' } });

  const cover = await helpers.uploadImage('cover-4.png', CONTENT.fr.title);
  // Dedicated uploads (helpers.uploadImage caches by file name and would reuse the SOCLE
  // covers with their own alternative text).
  const gallery = [];
  for (const [i, file] of ['cover-1.png', 'cover-3.png', 'cover-6.png'].entries()) {
    const filepath = join(ASSETS_DIR, file);
    const [uploaded] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: `galerie-${i + 1}.png`, alternativeText: CONTENT.fr.alt[i], caption: CONTENT.fr.alt[i] } },
        files: { filepath, originalFilename: `galerie-${i + 1}.png`, mimetype: 'image/png', size: statSync(filepath).size },
      });
    gallery.push(uploaded);
  }
  const galleryIds = gallery.map((f) => f.id as number);

  const data = (locale: Locale) => ({
    title: CONTENT[locale].title,
    slug: COMPOSED_SLUG[locale],
    excerpt: CONTENT[locale].excerpt,
    cover: cover.id,
    author: author?.documentId,
    category: category?.documentId,
    blocks: blocksFor(locale, galleryIds),
    seo: {
      metaTitle: CONTENT[locale].metaTitle,
      metaDescription: CONTENT[locale].metaDescription,
      shareImage: cover.id,
    },
  });

  const fr = await strapi.documents(ARTICLE).create({ locale: 'fr', data: data('fr') as any, status: 'published' });
  await strapi.documents(ARTICLE).update({
    documentId: fr.documentId,
    locale: 'en',
    data: data('en') as any,
    status: 'published',
  });
  console.log(`  article composé publié en fr et en (documentId ${fr.documentId})`);
};

export default seed;
