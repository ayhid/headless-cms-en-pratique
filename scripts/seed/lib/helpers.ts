// Helpers partages par tous les seeds (SOCLE et agents de phase 2).
import { statSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Core } from '@strapi/strapi';

export const ASSETS_DIR = join(__dirname, '..', 'assets');

export type SeedContext = {
  strapi: Core.Strapi;
  helpers: ReturnType<typeof createHelpers>;
};

/** Signature attendue d'un fichier scripts/seed/<agent>.ts (export default). */
export type SeedFn = (ctx: SeedContext) => Promise<void>;

/** Texte simple -> format "blocks" (editeur riche de Strapi 5). */
export function paragraphs(...texts: string[]) {
  return texts.map((text) => ({ type: 'paragraph', children: [{ type: 'text', text }] }));
}

export function heading(text: string, level = 2) {
  return { type: 'heading', level, children: [{ type: 'text', text }] };
}

export function createHelpers(strapi: Core.Strapi) {
  const cache = new Map<string, any>();

  /** Upload d'une image locale via le service upload de Strapi (reutilise si deja envoyee). */
  async function uploadImage(fileName: string, alternativeText: string) {
    if (cache.has(fileName)) return cache.get(fileName);
    const filepath = join(ASSETS_DIR, fileName);
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: basename(fileName), alternativeText, caption: alternativeText } },
        files: {
          filepath,
          originalFilename: basename(fileName),
          mimetype: 'image/png',
          size: statSync(filepath).size,
        },
      });
    cache.set(fileName, file);
    return file;
  }

  return { uploadImage, paragraphs, heading };
}
