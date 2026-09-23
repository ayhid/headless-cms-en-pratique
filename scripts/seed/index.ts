// Seed de demo du SOCLE, puis chargement automatique des seeds des agents (scripts/seed/<agent>.ts).
// Usage : npm run seed            (refuse si des articles existent deja)
//         npm run seed -- --force (ajoute quand meme)
// Toutes les ecritures passent par le Document Service (strapi.documents) et le service upload.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Core } from '@strapi/strapi';
import { loadStrapi } from '../lib/strapi-app';
import { createHelpers, heading, paragraphs, type SeedFn } from './lib/helpers';

const ARTICLE = 'api::article.article';
const AUTHOR = 'api::author.author';
const CATEGORY = 'api::category.category';

type Localized = { title: string; excerpt: string; body: string[]; quote: string };

type ArticleSeed = {
  slug: { fr: string; en: string };
  cover: string;
  author: number;
  category: number;
  fr: Localized;
  en: Localized;
  /** published : fr + en publies ; draft : brouillon fr jamais publie ; scheduled : brouillon fr + en avec publishAt passe */
  state: 'published' | 'draft' | 'scheduled';
};

const AUTHORS = [
  {
    name: 'Camille Verdier',
    bio: 'Architecte front chez Lumen Studio (societe fictive). Parle de performances web et de cache.',
    avatar: 'avatar-1.png',
  },
  {
    name: 'Yanis Morel',
    bio: 'Developpeur back-end chez Atelier Nordik (societe fictive). Adore les API bien typees.',
    avatar: 'avatar-2.png',
  },
  {
    name: 'Ines Carvalho',
    bio: 'Responsable editoriale chez Maison Pixel (societe fictive). Fait le lien entre redaction et tech.',
    avatar: 'avatar-3.png',
  },
];

const CATEGORIES = [
  { fr: { name: 'Architecture', slug: 'architecture' }, en: { name: 'Architecture', slug: 'architecture-en' } },
  { fr: { name: 'Front-end', slug: 'front-end' }, en: { name: 'Front-end', slug: 'front-end-en' } },
  { fr: { name: 'Editorial', slug: 'editorial' }, en: { name: 'Editorial', slug: 'editorial-en' } },
];

const ARTICLES: ArticleSeed[] = [
  {
    state: 'published',
    slug: { fr: 'pourquoi-un-cms-headless', en: 'why-a-headless-cms' },
    cover: 'cover-1.png',
    author: 0,
    category: 0,
    fr: {
      title: 'Pourquoi un CMS headless ?',
      excerpt: 'Separer le contenu de sa presentation : ce que cela change pour une equipe produit.',
      body: [
        'Un CMS headless expose le contenu via une API au lieu de generer des pages.',
        'Le front devient un client comme un autre, au meme titre qu une application mobile.',
      ],
      quote: 'Le contenu est une donnee, pas une page.',
    },
    en: {
      title: 'Why a headless CMS?',
      excerpt: 'Decoupling content from presentation: what it changes for a product team.',
      body: [
        'A headless CMS exposes content through an API instead of rendering pages.',
        'The front end becomes one client among others, just like a mobile app.',
      ],
      quote: 'Content is data, not a page.',
    },
  },
  {
    state: 'published',
    slug: { fr: 'document-service-strapi-5', en: 'strapi-5-document-service' },
    cover: 'cover-2.png',
    author: 1,
    category: 0,
    fr: {
      title: 'Le Document Service de Strapi 5',
      excerpt: 'documentId, brouillons et versions publiees : le nouveau modele mental.',
      body: [
        'Un document regroupe toutes les variantes d un contenu : locales, brouillon et version publiee.',
        'Le Document Service remplace l Entity Service et travaille avec un documentId stable.',
      ],
      quote: 'Un documentId, plusieurs versions.',
    },
    en: {
      title: 'The Strapi 5 Document Service',
      excerpt: 'documentId, drafts and published versions: the new mental model.',
      body: [
        'A document groups every variant of a piece of content: locales, draft and published version.',
        'The Document Service replaces the Entity Service and works with a stable documentId.',
      ],
      quote: 'One documentId, many versions.',
    },
  },
  {
    state: 'published',
    slug: { fr: 'revalidation-a-la-demande', en: 'on-demand-revalidation' },
    cover: 'cover-3.png',
    author: 0,
    category: 1,
    fr: {
      title: 'Revalidation a la demande avec Next.js',
      excerpt: 'Un webhook Strapi, un tag de cache, et la page se met a jour sans rebuild.',
      body: [
        'Chaque publication declenche un webhook vers le front.',
        'Le front invalide uniquement les tags concernes : la liste et le detail de l article.',
      ],
      quote: 'Invalider peu, mais au bon moment.',
    },
    en: {
      title: 'On-demand revalidation with Next.js',
      excerpt: 'A Strapi webhook, a cache tag, and the page updates without a rebuild.',
      body: [
        'Each publication triggers a webhook to the front end.',
        'The front end only invalidates the relevant tags: the list and the article detail.',
      ],
      quote: 'Invalidate little, but at the right time.',
    },
  },
  {
    state: 'published',
    slug: { fr: 'modeliser-avec-des-composants', en: 'modeling-with-components' },
    cover: 'cover-4.png',
    author: 2,
    category: 2,
    fr: {
      title: 'Modeliser avec des composants et des zones dynamiques',
      excerpt: 'Donner de la liberte aux redacteurs sans perdre la structure.',
      body: [
        'Les composants sont des groupes de champs reutilisables.',
        'Les zones dynamiques laissent la redaction assembler une page bloc par bloc.',
      ],
      quote: 'De la liberte, dans un cadre.',
    },
    en: {
      title: 'Modeling with components and dynamic zones',
      excerpt: 'Giving editors freedom without losing structure.',
      body: [
        'Components are reusable groups of fields.',
        'Dynamic zones let editors assemble a page block by block.',
      ],
      quote: 'Freedom, within a frame.',
    },
  },
  {
    state: 'published',
    slug: { fr: 'strapi-et-les-agents-ia', en: 'strapi-and-ai-agents' },
    cover: 'cover-5.png',
    author: 1,
    category: 0,
    fr: {
      title: 'Strapi et les agents IA via MCP',
      excerpt: 'Un serveur MCP natif pour laisser un agent lire et ecrire du contenu, avec des permissions.',
      body: [
        'Le protocole MCP standardise la facon dont un agent appelle des outils.',
        'Strapi expose ses content-types comme des outils, filtres par les permissions du token.',
      ],
      quote: 'Un agent n a que les droits de son token.',
    },
    en: {
      title: 'Strapi and AI agents through MCP',
      excerpt: 'A native MCP server to let an agent read and write content, with permissions.',
      body: [
        'The MCP protocol standardizes how an agent calls tools.',
        'Strapi exposes its content types as tools, filtered by the token permissions.',
      ],
      quote: 'An agent only has the rights of its token.',
    },
  },
  {
    state: 'draft',
    slug: { fr: 'brouillon-plugin-maison', en: 'draft-custom-plugin' },
    cover: 'cover-6.png',
    author: 2,
    category: 1,
    fr: {
      title: 'Brouillon : ecrire son propre plugin',
      excerpt: 'Article en cours de redaction, jamais publie (sert a la demo de preview).',
      body: ['Un plugin Strapi peut ajouter des routes, des services et des pages d admin.'],
      quote: 'Etendre plutot que contourner.',
    },
    en: {
      title: 'Draft: writing your own plugin',
      excerpt: 'Work in progress, never published (used for the preview demo).',
      body: ['A Strapi plugin can add routes, services and admin pages.'],
      quote: 'Extend rather than work around.',
    },
  },
  {
    state: 'scheduled',
    slug: { fr: 'publication-programmee', en: 'scheduled-publication' },
    cover: 'cover-7.png',
    author: 0,
    category: 2,
    fr: {
      title: 'Publication programmee par un cron',
      excerpt: 'Brouillon dont la date publishAt est deja passee : le cron doit le publier.',
      body: ['Un cron Strapi parcourt les brouillons et publie ceux dont la date est depassee.'],
      quote: 'Le bon contenu, au bon moment.',
    },
    en: {
      title: 'Publication scheduled by a cron',
      excerpt: 'Draft whose publishAt date is already past: the cron should publish it.',
      body: ['A Strapi cron scans drafts and publishes those whose date has passed.'],
      quote: 'The right content, at the right time.',
    },
  },
];

function articleData(seed: ArticleSeed, locale: 'fr' | 'en', refs: Record<string, any>) {
  const l = seed[locale];
  return {
    title: l.title,
    slug: seed.slug[locale],
    excerpt: l.excerpt,
    cover: refs.cover.id,
    author: refs.author.documentId,
    category: refs.category.documentId,
    publishAt: seed.state === 'scheduled' ? new Date(Date.now() - 60 * 60 * 1000).toISOString() : null,
    blocks: [
      { __component: 'blocks.rich-text', body: [heading(l.title), ...paragraphs(...l.body)] },
      { __component: 'blocks.quote', text: l.quote, author: AUTHORS[seed.author].name },
    ],
    seo: { metaTitle: l.title.slice(0, 70), metaDescription: l.excerpt.slice(0, 160), shareImage: refs.cover.id },
  };
}

async function seedSocle(strapi: Core.Strapi, helpers: ReturnType<typeof createHelpers>) {
  const authors = [];
  for (const a of AUTHORS) {
    const avatar = await helpers.uploadImage(a.avatar, `Portrait de ${a.name}`);
    authors.push(await strapi.documents(AUTHOR).create({ data: { name: a.name, bio: a.bio, avatar: avatar.id } }));
  }

  const categories = [];
  for (const c of CATEGORIES) {
    const created = await strapi.documents(CATEGORY).create({
      locale: 'fr',
      data: { ...c.fr, seo: { metaTitle: c.fr.name, metaDescription: `Articles de la categorie ${c.fr.name}` } },
    });
    await strapi.documents(CATEGORY).update({
      documentId: created.documentId,
      locale: 'en',
      data: { ...c.en, seo: { metaTitle: c.en.name, metaDescription: `Articles in the ${c.en.name} category` } },
    });
    categories.push(created);
  }

  for (const seed of ARTICLES) {
    const cover = await helpers.uploadImage(seed.cover, seed.fr.title);
    const refs = { cover, author: authors[seed.author], category: categories[seed.category] };
    const status = seed.state === 'published' ? 'published' : undefined;
    const fr = await strapi.documents(ARTICLE).create({ locale: 'fr', data: articleData(seed, 'fr', refs) as any, status });
    if (seed.state !== 'draft') {
      await strapi.documents(ARTICLE).update({
        documentId: fr.documentId,
        locale: 'en',
        data: articleData(seed, 'en', refs) as any,
        status,
      });
    }
  }
}

async function loadAgentSeeds(): Promise<Array<{ name: string; fn: SeedFn }>> {
  const dir = __dirname;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort();
  const seeds = [];
  for (const file of files) {
    const mod = await import(join(dir, file));
    const fn = (mod.default?.default ?? mod.default) as SeedFn;
    if (typeof fn !== 'function') throw new Error(`scripts/seed/${file} doit exporter une fonction par defaut`);
    seeds.push({ name: file.replace(/\.ts$/, ''), fn });
  }
  return seeds;
}

async function main() {
  const force = process.argv.includes('--force');
  const strapi = await loadStrapi();
  try {
    const helpers = createHelpers(strapi);
    const existing = await strapi.documents(ARTICLE).count({ locale: 'fr' });
    if (existing > 0 && !force) {
      console.log(`Seed ignore : ${existing} article(s) deja presents (utiliser --force pour forcer).`);
      return;
    }
    console.log('Seed SOCLE : auteurs, categories, articles fr/en, images...');
    await seedSocle(strapi, helpers);
    for (const { name, fn } of await loadAgentSeeds()) {
      console.log(`Seed agent : ${name}`);
      await fn({ strapi, helpers });
    }
    const published = await strapi.documents(ARTICLE).count({ locale: 'fr', status: 'published' });
    const publishedEn = await strapi.documents(ARTICLE).count({ locale: 'en', status: 'published' });
    console.log(`Seed termine : ${published} article(s) publies en fr, ${publishedEn} en en.`);
  } finally {
    await strapi.destroy();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('Echec du seed :', err);
    process.exit(1);
  },
);
