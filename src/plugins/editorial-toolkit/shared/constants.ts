/**
 * Shared between the server and the admin bundles (both builds inline this file).
 * Code is in English, every label shown on screen is in French.
 */

export const PLUGIN_ID = 'editorial-toolkit';

/** Name of the custom field, as registered on both sides. */
export const TONE_FIELD_NAME = 'tone';

/** UID stored in schema.json: `"customField": "plugin::editorial-toolkit.tone"`. */
export const TONE_CUSTOM_FIELD_UID = `plugin::${PLUGIN_ID}.${TONE_FIELD_NAME}`;

/** Content-type watched by the checklist, the dashboard and the MCP tool. */
export const ARTICLE_UID = 'api::article.article';

export type ToneKey = 'factuel' | 'pedagogique' | 'enthousiaste' | 'decale';

/** Stored values (plain strings) and their French labels. */
export const TONES: ReadonlyArray<{ value: ToneKey; label: string; hint: string }> = [
  { value: 'factuel', label: 'Factuel', hint: 'Des faits, des chiffres, pas d’adjectifs.' },
  { value: 'pedagogique', label: 'Pédagogique', hint: 'On explique pas à pas, avec des exemples.' },
  { value: 'enthousiaste', label: 'Enthousiaste', hint: 'On partage une découverte avec énergie.' },
  { value: 'decale', label: 'Décalé', hint: 'Un ton léger, avec une pointe d’humour.' },
];

export const toneLabel = (value: unknown): string | null =>
  TONES.find((tone) => tone.value === value)?.label ?? null;
