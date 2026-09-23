import type { Core } from '@strapi/strapi';

/**
 * Bootstrap idempotent du SOCLE.
 *
 * A chaque demarrage (develop, start, import, seed), on garantit :
 *  - les locales fr (par defaut) et en ;
 *  - le super admin de demo (DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD), admin en francais ;
 *  - deux API tokens aux valeurs FIXES venant de .env (STRAPI_READ_TOKEN, STRAPI_PREVIEW_TOKEN) ;
 *  - le webhook de revalidation vers FRONTEND_URL/api/revalidate.
 *
 * Ces elements ne sont pas embarques par `strapi export` (admins et tokens exclus),
 * c'est pour cela qu'ils sont recrees ici. Aucun contenu n'est cree ici : voir scripts/seed.
 */

const LOG_PREFIX = '[socle]';

export const DEMO_TOKENS = [
  {
    env: 'STRAPI_READ_TOKEN',
    name: 'Front (lecture seule)',
    description: 'Token read-only utilise par le front Next.js. Valeur imposee depuis .env par le bootstrap.',
  },
  {
    env: 'STRAPI_PREVIEW_TOKEN',
    name: 'Preview (brouillons)',
    description:
      'Token read-only dedie a la preview : lecture des brouillons via ?status=draft. Valeur imposee depuis .env par le bootstrap.',
  },
] as const;

export const WEBHOOK_NAME = 'Revalidation front Next.js';

async function ensureLocales(strapi: Core.Strapi) {
  const locales = strapi.plugin('i18n').service('locales');
  const wanted = [
    { code: 'fr', name: 'French (fr)' },
    { code: 'en', name: 'English (en)' },
  ];
  for (const locale of wanted) {
    const existing = await locales.findByCode(locale.code);
    if (!existing) {
      await locales.create(locale);
      strapi.log.info(`${LOG_PREFIX} locale ${locale.code} creee`);
    }
  }
  const current = await locales.getDefaultLocale();
  if (current !== 'fr') {
    await locales.setDefaultLocale({ code: 'fr' });
    strapi.log.info(`${LOG_PREFIX} locale par defaut : fr`);
  }
}

async function ensureDemoAdmin(strapi: Core.Strapi) {
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password) {
    strapi.log.warn(`${LOG_PREFIX} DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD absents : pas d'admin de demo`);
    return;
  }
  const userService = strapi.service('admin::user');
  const existing = await userService.findOneByEmail(email);
  if (existing) return;

  const superAdminRole = await strapi.service('admin::role').getSuperAdmin();
  if (!superAdminRole) {
    strapi.log.warn(`${LOG_PREFIX} role super admin introuvable, admin de demo non cree`);
    return;
  }
  await userService.create({
    email,
    firstname: 'Camille',
    lastname: 'Demo',
    password,
    isActive: true,
    registrationToken: null,
    roles: [superAdminRole.id],
    preferedLanguage: 'fr',
  });
  strapi.log.info(`${LOG_PREFIX} admin de demo cree : ${email}`);
}

async function ensureApiTokens(strapi: Core.Strapi) {
  // L'API create() de @strapi/admin genere toujours une accessKey aleatoire (verifie dans
  // node_modules/@strapi/admin/dist/server/server/src/services/api-token.js). On cree donc le token
  // via le service officiel, puis on impose la valeur de .env en reecrivant accessKey (hash HMAC
  // avec API_TOKEN_SALT, via le service) et encryptedKey (via le service de chiffrement) avec le
  // Query Engine. Resultat : valeur stable d'une remise a zero a l'autre.
  const tokenService = strapi.service('admin::api-token-content-api');
  const encryption = strapi.service('admin::encryption');

  for (const def of DEMO_TOKENS) {
    const value = process.env[def.env];
    if (!value) {
      strapi.log.warn(`${LOG_PREFIX} ${def.env} absent de .env : token "${def.name}" ignore`);
      continue;
    }
    let token = await strapi.db.query('admin::api-token').findOne({ where: { name: def.name } });
    if (!token) {
      token = await tokenService.create({
        name: def.name,
        description: def.description,
        type: 'read-only',
        lifespan: null,
      });
      strapi.log.info(`${LOG_PREFIX} API token cree : ${def.name}`);
    }
    const hashed = tokenService.hash(value);
    if (token.accessKey !== hashed) {
      await strapi.db.query('admin::api-token').update({
        where: { id: token.id },
        data: { accessKey: hashed, encryptedKey: encryption.encrypt(value) },
      });
      strapi.log.info(`${LOG_PREFIX} valeur du token "${def.name}" alignee sur ${def.env}`);
    }
  }
}

async function ensureWebhook(strapi: Core.Strapi) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const url = `${frontendUrl.replace(/\/$/, '')}/api/revalidate`;
  const store = strapi.get('webhookStore');
  const webhooks = await store.findWebhooks();
  const existing = webhooks.find((w: { name: string }) => w.name === WEBHOOK_NAME);
  if (existing) {
    if (existing.url !== url) {
      const updated = await store.updateWebhook(existing.id, { ...existing, url });
      strapi.get('webhookRunner').update(updated);
      strapi.log.info(`${LOG_PREFIX} webhook mis a jour : ${url}`);
    }
    return;
  }
  // Le header Authorization n'est PAS pose ici : il vient de webhooks.defaultHeaders dans
  // config/server.ts (config request de l'agent WEBHOOKS), pour garder le secret hors base.
  const webhook = await store.createWebhook({
    name: WEBHOOK_NAME,
    url,
    headers: {},
    events: ['entry.publish', 'entry.unpublish'],
    isEnabled: true,
  });
  strapi.get('webhookRunner').add(webhook);
  strapi.log.info(`${LOG_PREFIX} webhook cree : ${url}`);
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
    await ensureDemoAdmin(strapi);
    await ensureApiTokens(strapi);
    await ensureWebhook(strapi);
  },
};
