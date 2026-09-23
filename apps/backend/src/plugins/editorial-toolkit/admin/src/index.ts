import type { ComponentType } from 'react';

import { Feather } from '@strapi/icons';
import type { StrapiApp } from '@strapi/strapi/admin';
import type { ContentManagerPlugin } from '@strapi/content-manager/strapi-admin';

import { PLUGIN_ID, TONE_FIELD_NAME } from '../../shared/constants';
import { ChecklistPanel } from './components/ChecklistPanel';
import { Initializer } from './components/Initializer';
import { injectRevealZones } from './components/InjectionZoneReveal';
import { ToneFieldIcon } from './components/ToneFieldIcon';
import { getTranslation } from './utils/getTranslation';

const plugin: StrapiApp['appPlugins'][string] = {
  register(app) {
    // Sidebar entry + plugin page (dashboard fed by GET /editorial-toolkit/dashboard).
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Feather,
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'Boîte à outils éditoriale',
      },
      Component: () => import('./pages/App'),
      permissions: [],
    });

    /*
     * =====================================================================================
     *  CUSTOM FIELD "Ton éditorial"
     *
     *  A custom field does NOT create a new data type: `type: 'string'` below is an existing
     *  native Strapi type. The plugin only provides the input (a row of visual pills) used in
     *  the Content Manager, and the entry shown in the "Custom" tab of the Content-Type Builder.
     *  `pluginId` must match `plugin` in server/src/register.ts.
     * =====================================================================================
     */
    app.customFields.register({
      name: TONE_FIELD_NAME,
      pluginId: PLUGIN_ID,
      type: 'string',
      icon: ToneFieldIcon,
      intlLabel: {
        id: getTranslation('tone.label'),
        defaultMessage: 'Ton éditorial',
      },
      intlDescription: {
        id: getTranslation('tone.description'),
        defaultMessage: 'Choisir le ton d’un contenu parmi des pastilles visuelles',
      },
      components: {
        Input: () =>
          import('./components/ToneInput').then((module) => ({
            default: module.default as unknown as ComponentType,
          })),
      },
      options: {
        advanced: [
          {
            sectionTitle: {
              id: 'global.settings',
              defaultMessage: 'Paramètres',
            },
            items: [
              {
                name: 'required',
                type: 'checkbox',
                intlLabel: {
                  id: 'content-type-builder.form.attribute.item.requiredField',
                  defaultMessage: 'Champ obligatoire',
                },
                description: {
                  id: 'content-type-builder.form.attribute.item.requiredField.description',
                  defaultMessage: 'Vous ne pourrez pas créer d’entrée si ce champ est vide',
                },
              },
              {
                name: 'private',
                type: 'checkbox',
                intlLabel: {
                  id: 'content-type-builder.form.attribute.item.privateField',
                  defaultMessage: 'Champ privé',
                },
                description: {
                  id: 'content-type-builder.form.attribute.item.privateField.description',
                  defaultMessage: 'Ce champ n’apparaîtra pas dans les réponses de l’API',
                },
              },
            ],
          },
        ],
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  bootstrap(app) {
    // Content Manager API (not an injection zone): a panel in the Edit View side area.
    const apis = app.getPlugin('content-manager').apis as ContentManagerPlugin['config']['apis'];
    apis.addEditViewSidePanel([ChecklistPanel]);

    // Injection zones (not a Content Manager API): "mode révélateur", dashed labels that show
    // where each Content Manager zone is. Off by default, switch on the plugin dashboard.
    // Why injection zones here, and why not editView.informations: components/InjectionZoneReveal.tsx.
    injectRevealZones(app);
  },

  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(`./translations/${locale}.json`)) as {
            default: Record<string, string>;
          };
          const newData: Record<string, string> = {};
          for (const key of Object.keys(data)) {
            newData[getTranslation(key)] = data[key];
          }
          return { data: newData, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};

export default plugin;
