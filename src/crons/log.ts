// Shared helpers for the cron tasks: console (Strapi logger) + logs/crons.log, French dates.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Core } from '@strapi/strapi';

export const TIMEZONE = 'Europe/Paris';

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIMEZONE,
  dateStyle: 'full',
  timeStyle: 'medium',
});
const timeFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: TIMEZONE, timeStyle: 'medium' });

/** e.g. "mercredi 23 septembre 2026 à 14:05:30" */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return 'non programmée';
  return dateTimeFormat.format(new Date(value));
}

/** e.g. "14:05:30" */
export function formatTime(value: Date = new Date()): string {
  return timeFormat.format(value);
}

export function logFilePath(strapi: Core.Strapi): string {
  return join(strapi.dirs.app.root, 'logs', 'crons.log');
}

/** Writes each line to the console (strapi.log) and appends them to logs/crons.log. */
export function writeLines(strapi: Core.Strapi, lines: string[], level: 'info' | 'warn' | 'error' = 'info') {
  for (const line of lines) strapi.log[level](line);
  try {
    const file = logFilePath(strapi);
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${lines.join('\n')}\n`, 'utf8');
  } catch (err: any) {
    strapi.log.error(`[crons] Impossible d'écrire dans logs/crons.log : ${err?.message ?? err}`);
  }
}

/** Locale codes configured in the i18n plugin (default locale first). */
export async function getLocales(strapi: Core.Strapi): Promise<string[]> {
  const service = strapi.plugin('i18n').service('locales');
  const locales: Array<{ code: string }> = await service.find();
  const defaultCode: string = await service.getDefaultLocale();
  return locales.map((l) => l.code).sort((a, b) => Number(b === defaultCode) - Number(a === defaultCode));
}
