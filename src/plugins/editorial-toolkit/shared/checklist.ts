/**
 * Publication checklist rules, pure functions shared by:
 * - the Content Manager side panel (computed live from the form values),
 * - the dashboard route (computed on the server from the Document Service),
 * - the MCP tool `editorial_checklist`.
 */
import { toneLabel } from './constants';

export const EXCERPT_MIN = 50;
export const EXCERPT_MAX = 200;

export type ChecklistKey = 'cover' | 'excerpt' | 'seo' | 'blocks' | 'publishAt' | 'tone';

export type ChecklistItem = {
  key: ChecklistKey;
  ok: boolean;
  /** A required item blocks the "ready to publish" state, a recommended one does not. */
  required: boolean;
  /** French label, also used as defaultMessage by the admin translations. */
  label: string;
  /** French detail explaining the current state. */
  detail: string;
};

export type ChecklistResult = {
  items: ChecklistItem[];
  done: number;
  total: number;
  ready: boolean;
};

/** Minimal shape of an article, as found in the form values or in a Document Service result. */
export type ChecklistInput = {
  cover?: unknown;
  excerpt?: unknown;
  seo?: { metaTitle?: unknown; metaDescription?: unknown } | null;
  blocks?: unknown;
  publishAt?: unknown;
  [key: string]: unknown;
};

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasMedia = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  // A bare id (number or string) is also a valid media reference.
  return value !== '' && value !== 0;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });
};

/**
 * @param toneField attribute name of the "Ton éditorial" custom field on the model,
 *                  or null when the model does not use it (then the item is skipped).
 */
export const computeChecklist = (doc: ChecklistInput, toneField: string | null): ChecklistResult => {
  const excerpt = typeof doc.excerpt === 'string' ? doc.excerpt.trim() : '';
  const blocksCount = Array.isArray(doc.blocks) ? doc.blocks.length : 0;
  const seo = doc.seo ?? {};
  const seoTitle = isFilledString(seo.metaTitle);
  const seoDescription = isFilledString(seo.metaDescription);

  const items: ChecklistItem[] = [
    {
      key: 'cover',
      required: true,
      ok: hasMedia(doc.cover),
      label: 'Image de couverture',
      detail: hasMedia(doc.cover) ? 'Présente' : 'Aucune image sélectionnée',
    },
    {
      key: 'excerpt',
      required: true,
      ok: excerpt.length >= EXCERPT_MIN && excerpt.length <= EXCERPT_MAX,
      label: `Résumé de ${EXCERPT_MIN} à ${EXCERPT_MAX} caractères`,
      detail:
        excerpt.length === 0
          ? 'Résumé vide'
          : `${excerpt.length} caractère${excerpt.length > 1 ? 's' : ''}`,
    },
    {
      key: 'seo',
      required: true,
      ok: seoTitle && seoDescription,
      label: 'SEO : titre et description',
      detail:
        seoTitle && seoDescription
          ? 'Titre et description renseignés'
          : !seoTitle && !seoDescription
            ? 'Titre et description manquants'
            : !seoTitle
              ? 'Titre SEO manquant'
              : 'Description SEO manquante',
    },
    {
      key: 'blocks',
      required: true,
      ok: blocksCount > 0,
      label: 'Au moins un bloc de contenu',
      detail: blocksCount === 0 ? 'Aucun bloc' : `${blocksCount} bloc${blocksCount > 1 ? 's' : ''}`,
    },
    {
      key: 'publishAt',
      required: true,
      ok: isFilledString(doc.publishAt),
      label: 'Date de parution',
      detail: isFilledString(doc.publishAt) ? formatDate(doc.publishAt) : 'Non planifiée',
    },
  ];

  if (toneField) {
    const label = toneLabel(doc[toneField]);
    items.push({
      key: 'tone',
      required: false,
      ok: label !== null,
      label: 'Ton éditorial choisi (recommandé)',
      detail: label ?? 'Aucun ton choisi',
    });
  }

  const required = items.filter((item) => item.required);
  return {
    items,
    done: items.filter((item) => item.ok).length,
    total: items.length,
    ready: required.every((item) => item.ok),
  };
};

/** Finds the attribute that uses a given custom field in a content-type schema. */
export const findCustomFieldAttribute = (
  attributes: Record<string, { customField?: string }> | undefined,
  customFieldUid: string
): string | null => {
  if (!attributes) return null;
  const entry = Object.entries(attributes).find(([, attribute]) => attribute?.customField === customFieldUid);
  return entry ? entry[0] : null;
};
