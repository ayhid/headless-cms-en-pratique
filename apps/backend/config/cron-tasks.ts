// Cron tasks, object format (https://docs.strapi.io/cms/configurations/cron).
// Enabled from config/server.ts: cron: { enabled: true, tasks: cronTasks }.
//
// DEMO_MODE=true -> short rules, readable live during the talk.
// Otherwise      -> realistic rules, Europe/Paris time zone.
import { publishScheduledArticles } from '../src/crons/publish-scheduled';
import { writeDraftsDigest } from '../src/crons/drafts-digest';
import { TIMEZONE } from '../src/crons/log';

const demo = process.env.DEMO_MODE === 'true';

const CRON_RULES = {
  // Realistic: every 5 minutes, '0 */5 * * * *'. Demo: every 30 seconds.
  publishScheduledArticles: demo ? '*/30 * * * * *' : '0 */5 * * * *',
  // Realistic: every day at 8:00 (Paris), '0 0 8 * * *'. Demo: every minute at second 15,
  // offset from the publication task so both outputs never interleave.
  draftsDigest: demo ? '15 * * * * *' : '0 0 8 * * *',
};

export default {
  publishScheduledArticles: {
    task: publishScheduledArticles,
    options: { rule: CRON_RULES.publishScheduledArticles, tz: TIMEZONE },
  },
  draftsDigest: {
    task: writeDraftsDigest,
    options: { rule: CRON_RULES.draftsDigest, tz: TIMEZONE },
  },
};
