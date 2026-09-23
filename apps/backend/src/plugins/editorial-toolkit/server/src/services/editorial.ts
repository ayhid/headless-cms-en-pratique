import type { Core } from '@strapi/strapi';

import { ARTICLE_UID, TONE_CUSTOM_FIELD_UID, toneLabel } from '../../../shared/constants';
import { computeChecklist, findCustomFieldAttribute, type ChecklistResult } from '../../../shared/checklist';

/**
 * Every read goes through the Document Service (strapi.documents), never raw SQL,
 * so Draft & Publish and i18n are handled by Strapi itself.
 */

type Status = 'published' | 'draft' | 'modified';

type ArticleSummary = {
  documentId: string;
  locale: string;
  title: string;
  status: Status;
  updatedAt: string | null;
  tone: string | null;
  checklist: ChecklistResult;
};

type LocaleStats = {
  code: string;
  name: string;
  isDefault: boolean;
  total: number;
  published: number;
  draft: number;
  modified: number;
};

const CHECKLIST_POPULATE = {
  cover: true,
  seo: true,
  blocks: true,
} as const;

const editorial = ({ strapi }: { strapi: Core.Strapi }) => {
  const getToneField = (): string | null => {
    const contentType = strapi.contentType(ARTICLE_UID as any);
    return findCustomFieldAttribute(contentType?.attributes as any, TONE_CUSTOM_FIELD_UID);
  };

  const getLocales = async (): Promise<Array<{ code: string; name: string; isDefault: boolean }>> => {
    const i18n = strapi.plugin('i18n');
    if (!i18n) return [{ code: 'fr', name: 'Français', isDefault: true }];
    const service = i18n.service('locales');
    const locales = (await service.find()) as Array<{ code: string; name: string }>;
    const defaultCode = (await service.getDefaultLocale()) as string | undefined;
    // French display names ("Français", "Anglais") rather than the stored English ones.
    const displayNames = new Intl.DisplayNames(['fr'], { type: 'language' });
    const frenchName = (code: string, fallback: string) => {
      const name = displayNames.of(code);
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : fallback;
    };
    return locales
      .map(({ code, name }) => ({ code, name: frenchName(code, name), isDefault: code === defaultCode }))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.code.localeCompare(b.code));
  };

  const summarize = (
    doc: any,
    locale: string,
    status: Status,
    toneField: string | null
  ): ArticleSummary => ({
    documentId: doc.documentId,
    locale,
    title: doc.title ?? '(sans titre)',
    status,
    updatedAt: doc.updatedAt ?? null,
    tone: toneField ? toneLabel(doc[toneField]) : null,
    checklist: computeChecklist(doc, toneField),
  });

  return {
    getToneField,

    /** Checklist of one document (draft version by default), used by the MCP tool. */
    async getChecklist(documentId: string, locale?: string, status: 'draft' | 'published' = 'draft') {
      const toneField = getToneField();
      const doc = await strapi.documents(ARTICLE_UID as any).findOne({
        documentId,
        locale,
        status,
        populate: CHECKLIST_POPULATE as any,
      });
      if (!doc) return null;
      return {
        documentId,
        locale: (doc as any).locale ?? locale ?? null,
        status,
        title: (doc as any).title ?? '(sans titre)',
        ...computeChecklist(doc as any, toneField),
      };
    },

    /** Data of the plugin dashboard: counts per status and locale, drafts ready to publish. */
    async getDashboard() {
      const toneField = getToneField();
      const locales = await getLocales();
      const perLocale: LocaleStats[] = [];
      const drafts: ArticleSummary[] = [];
      const toneCounts: Record<string, number> = {};

      for (const locale of locales) {
        const [draftVersions, publishedVersions] = await Promise.all([
          strapi.documents(ARTICLE_UID as any).findMany({
            locale: locale.code,
            status: 'draft',
            populate: CHECKLIST_POPULATE as any,
            sort: 'updatedAt:desc',
          }),
          strapi.documents(ARTICLE_UID as any).findMany({
            locale: locale.code,
            status: 'published',
            fields: ['documentId', 'updatedAt'] as any,
          }),
        ]);

        const publishedById = new Map<string, any>(
          (publishedVersions as any[]).map((doc) => [doc.documentId, doc])
        );

        const stats: LocaleStats = { ...locale, total: 0, published: 0, draft: 0, modified: 0 };

        for (const doc of draftVersions as any[]) {
          const published = publishedById.get(doc.documentId);
          let status: Status = 'draft';
          if (published) {
            // Same rule as the Content Manager: a draft saved after the published version is "modified".
            const draftTime = new Date(doc.updatedAt).getTime();
            const publishedTime = new Date(published.updatedAt).getTime();
            status = draftTime > publishedTime ? 'modified' : 'published';
          }
          stats.total += 1;
          stats[status] += 1;

          if (toneField) {
            const tone = toneLabel(doc[toneField]) ?? 'Non renseigné';
            toneCounts[tone] = (toneCounts[tone] ?? 0) + 1;
          }

          if (status !== 'published') {
            drafts.push(summarize(doc, locale.code, status, toneField));
          }
        }

        perLocale.push(stats);
      }

      const totals = perLocale.reduce(
        (acc, stats) => ({
          total: acc.total + stats.total,
          published: acc.published + stats.published,
          draft: acc.draft + stats.draft,
          modified: acc.modified + stats.modified,
        }),
        { total: 0, published: 0, draft: 0, modified: 0 }
      );

      return {
        generatedAt: new Date().toISOString(),
        contentType: ARTICLE_UID,
        toneField,
        totals,
        perLocale,
        tones: Object.entries(toneCounts).map(([label, count]) => ({ label, count })),
        readyToPublish: drafts.filter((doc) => doc.checklist.ready),
        toComplete: drafts.filter((doc) => !doc.checklist.ready),
      };
    },
  };
};

export default editorial;
