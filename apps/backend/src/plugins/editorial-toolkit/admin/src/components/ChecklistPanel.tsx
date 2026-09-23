import * as React from 'react';

import { Badge, Box, Flex, Typography } from '@strapi/design-system';
import { CheckCircle, CrossCircle, WarningCircle } from '@strapi/icons';
import { useForm, unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import type { PanelComponent, PanelComponentProps } from '@strapi/content-manager/strapi-admin';
import { useIntl } from 'react-intl';

import { ARTICLE_UID, TONE_CUSTOM_FIELD_UID } from '../../../shared/constants';
import { computeChecklist, findCustomFieldAttribute, type ChecklistItem } from '../../../shared/checklist';
import { getTranslation } from '../utils/getTranslation';

/*
 * Side panel of the Content Manager Edit View, registered with the Content Manager API
 * `addEditViewSidePanel` (see docs/plugin/choix-extension.md).
 * The checklist is computed live from the form values: it updates while the editor types,
 * before saving.
 */

const ItemRow = ({ item }: { item: ChecklistItem }) => {
  const { formatMessage } = useIntl();
  const Icon = item.ok ? CheckCircle : item.required ? CrossCircle : WarningCircle;
  const color = item.ok ? 'success600' : item.required ? 'danger600' : 'warning600';

  return (
    <Flex tag="li" gap={2} alignItems="flex-start">
      <Box paddingTop="2px">
        <Icon aria-hidden width="1.6rem" height="1.6rem" fill={color} />
      </Box>
      <Flex direction="column" alignItems="flex-start" gap={0}>
        <Typography variant="omega" fontWeight="semiBold" textColor="neutral800">
          {formatMessage({ id: getTranslation(`checklist.${item.key}`), defaultMessage: item.label })}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {item.detail}
        </Typography>
      </Flex>
    </Flex>
  );
};

const ChecklistContent = () => {
  const { formatMessage } = useIntl();
  const values = useForm('EditorialChecklist', (state) => state.values) as Record<string, unknown>;
  const { contentType } = useContentManagerContext();

  const toneField = findCustomFieldAttribute(contentType?.attributes as any, TONE_CUSTOM_FIELD_UID);
  const result = computeChecklist(values ?? {}, toneField);
  const percent = Math.round((result.done / Math.max(result.total, 1)) * 100);

  return (
    <Flex direction="column" alignItems="stretch" gap={4} width="100%">
      <Flex justifyContent="space-between" alignItems="center" gap={2}>
        <Typography variant="sigma" textColor="neutral600">
          {formatMessage(
            { id: getTranslation('checklist.progress'), defaultMessage: '{done} sur {total} critères' },
            { done: result.done, total: result.total }
          )}
        </Typography>
        {result.ready ? (
          <Badge backgroundColor="success100" textColor="success700">
            {formatMessage({ id: getTranslation('checklist.ready'), defaultMessage: 'Prêt à publier' })}
          </Badge>
        ) : (
          <Badge backgroundColor="warning100" textColor="warning700">
            {formatMessage({ id: getTranslation('checklist.notReady'), defaultMessage: 'À compléter' })}
          </Badge>
        )}
      </Flex>
      {/* The design-system ProgressBar is meant for coloured backgrounds (uploads): a plain
          track built from Box tokens reads better in a side panel, in light and dark themes. */}
      <Box
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent} %`}
        background="neutral150"
        hasRadius
        height="0.8rem"
        width="100%"
        overflow="hidden"
      >
        <Box
          background={result.ready ? 'success500' : 'warning500'}
          height="100%"
          width={`${percent}%`}
          style={{ transition: 'width 200ms ease-out' }}
        />
      </Box>
      <Flex tag="ul" direction="column" alignItems="stretch" gap={3}>
        {result.items.map((item) => (
          <ItemRow key={item.key} item={item} />
        ))}
      </Flex>
    </Flex>
  );
};

// Rendered as a component by the Content Manager (hooks are allowed here).
export const ChecklistPanel: PanelComponent = ({ model }: PanelComponentProps) => {
  const { formatMessage } = useIntl();
  if (model !== ARTICLE_UID) {
    // Returning null hides the panel on the other content-types.
    return null as unknown as ReturnType<PanelComponent>;
  }
  return {
    title: formatMessage({ id: getTranslation('checklist.title'), defaultMessage: 'Check-list de publication' }),
    content: <ChecklistContent />,
  };
};
