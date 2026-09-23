// Pending drafts digest: lists, per locale, the article drafts never published or modified
// since their last publication, and writes a readable summary to logs/crons.log.
import type { Core } from '@strapi/strapi';
import { formatDateTime, getLocales, writeLines } from './log';

const UID = 'api::article.article';
const RULE = '='.repeat(64);

type Filter = 'never-published' | 'modified';
const LABELS: Record<Filter, string> = {
  'never-published': 'jamais publié',
  modified: 'modifié depuis la publication',
};

export async function writeDraftsDigest({ strapi }: { strapi: Core.Strapi }) {
  try {
    const lines: string[] = [
      RULE,
      'Récapitulatif des brouillons en attente',
      `Généré le ${formatDateTime(new Date())} (heure de Paris)`,
      RULE,
    ];
    let total = 0;

    for (const locale of await getLocales(strapi)) {
      const rows: string[] = [];
      for (const filter of Object.keys(LABELS) as Filter[]) {
        const drafts = await strapi.documents(UID).findMany({
          locale,
          status: 'draft',
          publicationFilter: filter,
          fields: ['title', 'publishAt'],
          populate: { author: { fields: ['name'] } },
          sort: 'title:asc',
        });
        for (const d of drafts as any[]) {
          rows.push(`  - « ${d.title} »`);
          rows.push(
            `      auteur : ${d.author?.name ?? 'non renseigné'} | parution prévue : ${formatDateTime(d.publishAt)} | ${LABELS[filter]}`,
          );
        }
      }
      const count = rows.length / 2;
      total += count;
      lines.push(`Locale ${locale} : ${count} brouillon(s) en attente`);
      lines.push(...(count ? rows : ['  (aucun)']));
    }

    lines.push(`Total : ${total} brouillon(s) en attente`, RULE);
    writeLines(strapi, lines);
  } catch (err: any) {
    writeLines(strapi, [`[cron récapitulatif] Erreur : ${err?.message ?? err}`], 'error');
  }
}
