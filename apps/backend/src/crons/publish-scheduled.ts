// Scheduled publication: publishes every article draft whose publishAt date is past.
// Document Service only (no SQL, no Query Engine). Idempotent: once a locale is published it
// is no longer "never-published", so the next run has nothing left to do.
import type { Core } from '@strapi/strapi';
import { formatDateTime, formatTime, getLocales, writeLines } from './log';

const UID = 'api::article.article';
let running = false;

export async function publishScheduledArticles({ strapi }: { strapi: Core.Strapi }) {
  if (running) return; // previous run still in progress: skip this tick
  running = true;
  const prefix = `[cron publication ${formatTime()}]`;
  try {
    const now = new Date();
    const published: string[] = [];
    const failures: string[] = [];

    for (const locale of await getLocales(strapi)) {
      const due = await strapi.documents(UID).findMany({
        locale,
        status: 'draft',
        publicationFilter: 'never-published',
        filters: { publishAt: { $notNull: true, $lte: now.toISOString() } },
        fields: ['title', 'publishAt'],
        sort: 'publishAt:asc',
      });

      for (const article of due) {
        try {
          await strapi.documents(UID).publish({ documentId: article.documentId, locale });
          published.push(
            `${prefix} Publié : « ${article.title} » (${locale}), prévu le ${formatDateTime(article.publishAt as string)}`,
          );
        } catch (err: any) {
          failures.push(`${prefix} Échec de publication de « ${article.title} » (${locale}) : ${err?.message ?? err}`);
        }
      }
    }

    if (published.length === 0 && failures.length === 0) {
      writeLines(strapi, [`${prefix} Aucun article programmé à publier.`]);
    }
    if (published.length) {
      writeLines(strapi, [...published, `${prefix} ${published.length} publication(s) programmée(s) effectuée(s).`]);
    }
    if (failures.length) writeLines(strapi, failures, 'error');
  } catch (err: any) {
    writeLines(strapi, [`${prefix} Erreur : ${err?.message ?? err}`], 'error');
  } finally {
    running = false;
  }
}
