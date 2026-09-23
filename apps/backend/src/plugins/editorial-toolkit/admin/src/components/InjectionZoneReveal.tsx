/*
 * =========================================================================================
 *  MODE RÉVÉLATEUR : rendre visibles les injection zones du Content Manager
 *
 *  Two extension mechanisms, two different jobs (doc:
 *  https://docs.strapi.io/cms/plugins-development/admin-injection-zones, section
 *  "Injection zones vs. Content Manager APIs"):
 *
 *  - The "Check-list de publication" panel uses a Content Manager API,
 *    `apis.addEditViewSidePanel` (see ChecklistPanel.tsx and docs/plugin/choix-extension.md).
 *    The doc recommends these APIs for panels, actions and buttons: better typed, more robust,
 *    and the panel gets the native look (title, card, spacing) plus typed props.
 *
 *  - This reveal mode uses INJECTION ZONES (`getPlugin('content-manager').injectComponent`),
 *    because its purpose is to target precise, predefined spots of the UI that the Content
 *    Manager APIs do not cover (next to the list filters, inside the confirmation modals,
 *    in the Edit View links, in the preview header). Doc: "Use injection zones when you need
 *    to insert components into specific UI areas not covered by the Content Manager APIs."
 *
 *  Each injected component renders a dashed label with the zone's technical name, and only
 *  while the reveal mode is on (switch on the plugin dashboard, stored in localStorage).
 *  When the mode is off, it renders null: no visual impact at all.
 *
 *  What Content Manager 5.54.0 actually does with each zone (checked in
 *  node_modules/@strapi/content-manager/dist/admin, components/InjectionZone.mjs and callers):
 *  - listView.actions        rendered by ListViewPage, no props;
 *  - editView.right-links    rendered by EditView Panels, props: { slug } (content-type uid);
 *  - preview.actions         rendered by PreviewHeader, no props;
 *  - listView.publishModalAdditionalInfos, listView.unpublishModalAdditionalInfos,
 *    listView.deleteModalAdditionalInfos: declared in INJECTION_ZONES (and used by the i18n
 *    plugin), but no component of 5.54.0 renders them. We inject there anyway: the label
 *    will show up as soon as a Strapi version renders these zones again.
 *
 *  NOT injected: editView.informations. The doc flags it as internal ("considered internal.
 *  For third-party plugins, editView.right-links is the most stable and officially recommended
 *  Edit view extension point"), and it may change between versions without notice.
 * =========================================================================================
 */
import * as React from 'react';

import { Badge, Flex, Typography } from '@strapi/design-system';
import type { StrapiApp } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { PLUGIN_ID } from '../pluginId';
import { getTranslation } from '../utils/getTranslation';
import { useRevealMode } from '../utils/revealMode';

/**
 * Zones targeted by the reveal mode (Content Manager, Strapi 5.54.0), written in full as
 * `view.zone` so that `demo:check` can find them in the built bundle (dist/admin).
 */
export const REVEALED_ZONES = [
  'listView.actions',
  'listView.publishModalAdditionalInfos',
  'listView.unpublishModalAdditionalInfos',
  'listView.deleteModalAdditionalInfos',
  'editView.right-links',
  'preview.actions',
  // editView.informations: intentionally absent, internal zone (see the header comment).
] as const;

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** Dashed label, built with design system tokens only: readable in light and dark themes. */
const ZoneLabel = ({ area, props }: { area: string; props: Record<string, unknown> }) => {
  const { formatMessage } = useIntl();
  const propNames = Object.keys(props);

  return (
    <Flex
      tag="span"
      display="inline-flex"
      alignItems="center"
      gap={2}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      background="primary100"
      borderColor="primary600"
      borderStyle="dashed"
      borderWidth="2px"
      hasRadius
      shrink={0}
      data-editorial-toolkit-zone={area}
      title={formatMessage(
        {
          id: getTranslation('reveal.label.title'),
          defaultMessage: 'Composant injecté par le plugin Boîte à outils éditoriale dans la zone {area}',
        },
        { area }
      )}
    >
      <Badge size="S" backgroundColor="primary600" textColor="neutral0">
        {formatMessage({ id: getTranslation('reveal.label.badge'), defaultMessage: 'Injection zone' })}
      </Badge>
      <Typography tag="code" variant="omega" fontWeight="bold" textColor="primary700" style={{ fontFamily: MONO_FONT }}>
        {area}
      </Typography>
      {propNames.length > 0 ? (
        <Typography variant="pi" textColor="neutral600" style={{ fontFamily: MONO_FONT }}>
          {formatMessage(
            { id: getTranslation('reveal.label.props'), defaultMessage: 'props : {names}' },
            { names: propNames.join(', ') }
          )}
        </Typography>
      ) : null}
    </Flex>
  );
};

const makeRevealComponent = (area: string) => {
  const RevealComponent = (props: Record<string, unknown>) => {
    const [enabled] = useRevealMode();
    if (!enabled) {
      return null;
    }
    return <ZoneLabel area={area} props={props} />;
  };
  RevealComponent.displayName = `EditorialToolkitReveal(${area})`;
  return RevealComponent;
};

/** To be called from the admin `bootstrap(app)`: zones are filled in bootstrap, not in register. */
export const injectRevealZones = (app: Pick<StrapiApp, 'getPlugin'>) => {
  const contentManager = app.getPlugin('content-manager');
  if (!contentManager) {
    return;
  }
  for (const area of REVEALED_ZONES) {
    const [view, zone] = area.split('.') as [string, string];
    contentManager.injectComponent(view, zone, {
      name: `${PLUGIN_ID}-reveal-${view}-${zone}`,
      Component: makeRevealComponent(area) as React.ComponentType,
    });
  }
};
