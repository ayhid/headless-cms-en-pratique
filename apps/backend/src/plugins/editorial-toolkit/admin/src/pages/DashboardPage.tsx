import * as React from 'react';

import {
  Badge,
  Box,
  Button,
  EmptyStateLayout,
  Field,
  Flex,
  Grid,
  LinkButton,
  Status,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Toggle,
  Tr,
  Typography,
} from '@strapi/design-system';
import { ArrowClockwise, CheckCircle, Earth, Feather, Pencil, Sparkle, Eye } from '@strapi/icons';
import { Layouts, Page, useFetchClient } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { ARTICLE_UID, PLUGIN_ID } from '../../../shared/constants';
import type { ChecklistResult } from '../../../shared/checklist';
import { getTranslation } from '../utils/getTranslation';
import { useRevealMode } from '../utils/revealMode';

type DocStatus = 'published' | 'draft' | 'modified';

type ArticleSummary = {
  documentId: string;
  locale: string;
  title: string;
  status: DocStatus;
  updatedAt: string | null;
  tone: string | null;
  checklist: ChecklistResult;
};

type DashboardData = {
  generatedAt: string;
  toneField: string | null;
  totals: { total: number; published: number; draft: number; modified: number };
  perLocale: Array<{
    code: string;
    name: string;
    isDefault: boolean;
    total: number;
    published: number;
    draft: number;
    modified: number;
  }>;
  tones: Array<{ label: string; count: number }>;
  readyToPublish: ArticleSummary[];
  toComplete: ArticleSummary[];
};

const editUrl = (doc: ArticleSummary) =>
  `/content-manager/collection-types/${ARTICLE_UID}/${doc.documentId}?plugins[i18n][locale]=${doc.locale}`;

const StatusBadge = ({ status }: { status: DocStatus }) => {
  const { formatMessage } = useIntl();
  const variants: Record<DocStatus, { variant: 'success' | 'secondary' | 'alternative'; label: string }> = {
    published: { variant: 'success', label: 'Publié' },
    draft: { variant: 'secondary', label: 'Brouillon' },
    modified: { variant: 'alternative', label: 'Modifié' },
  };
  const { variant, label } = variants[status];
  return (
    <Flex>
      <Status variant={variant} size="S">
        <Typography tag="span" variant="omega" fontWeight="bold">
          {formatMessage({ id: getTranslation(`status.${status}`), defaultMessage: label })}
        </Typography>
      </Status>
    </Flex>
  );
};

const KpiCard = ({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentType<any>;
  value: number;
  label: string;
  color: string;
}) => (
  <Box background="neutral0" hasRadius shadow="tableShadow" padding={6} width="100%">
    <Flex gap={4} alignItems="center">
      <Flex
        background={`${color}100`}
        hasRadius
        width="4.8rem"
        height="4.8rem"
        justifyContent="center"
        alignItems="center"
        shrink={0}
      >
        <Icon aria-hidden width="2.4rem" height="2.4rem" fill={`${color}600`} />
      </Flex>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="alpha" textColor="neutral800">
          {value}
        </Typography>
        <Typography variant="sigma" textColor="neutral600">
          {label}
        </Typography>
      </Flex>
    </Flex>
  </Box>
);

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <Flex direction="column" alignItems="stretch" gap={3}>
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Typography variant="delta" tag="h2" textColor="neutral800">
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="pi" textColor="neutral600">
          {subtitle}
        </Typography>
      ) : null}
    </Flex>
    {children}
  </Flex>
);

const OpenButton = ({ doc }: { doc: ArticleSummary }) => {
  const { formatMessage } = useIntl();
  return (
    <LinkButton tag={Link} to={editUrl(doc)} variant="tertiary" size="S" startIcon={<Pencil />}>
      {formatMessage({ id: getTranslation('dashboard.open'), defaultMessage: 'Ouvrir' })}
    </LinkButton>
  );
};

/**
 * "Mode révélateur" switch: shows the dashed labels injected in the Content Manager
 * injection zones (components/InjectionZoneReveal.tsx). Stored in localStorage, live.
 */
const RevealModeCard = () => {
  const { formatMessage } = useIntl();
  const [enabled, setEnabled] = useRevealMode();
  const t = (id: string, defaultMessage: string) => formatMessage({ id: getTranslation(id), defaultMessage });

  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
      <Field.Root
        name="reveal-injection-zones"
        id="editorial-toolkit-reveal-injection-zones"
        hint={t(
          'reveal.hint',
          'Affiche une étiquette en pointillés à chaque emplacement du Content Manager où un plugin peut injecter un composant (liste, fenêtres de confirmation, édition, aperçu). Réglage mémorisé dans ce navigateur, appliqué tout de suite dans tous les onglets.'
        )}
      >
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Field.Label>{t('reveal.label', 'Afficher les injection zones')}</Field.Label>
          <Box maxWidth="32rem">
            <Toggle
              checked={enabled}
              onLabel={t('reveal.on', 'Affichées')}
              offLabel={t('reveal.off', 'Masquées')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEnabled(event.target.checked)}
            />
          </Box>
          <Field.Hint />
        </Flex>
      </Field.Root>
    </Box>
  );
};

const DashboardPage = () => {
  const { formatMessage, formatDate } = useIntl();
  const { get } = useFetchClient();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const t = (id: string, defaultMessage: string, values?: Record<string, React.ReactNode>) =>
    formatMessage({ id: getTranslation(id), defaultMessage }, values as any) as string;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await get<{ data: DashboardData }>(`/${PLUGIN_ID}/dashboard`);
      setData(response.data.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <Page.Loading />;
  }

  if (error || !data) {
    return <Page.Error />;
  }

  return (
    <Page.Main>
      <Page.Title>{t('dashboard.title', 'Tableau de bord éditorial')}</Page.Title>
      <Layouts.Header
        title={t('dashboard.title', 'Tableau de bord éditorial')}
        subtitle={t(
          'dashboard.subtitle',
          'Articles par statut et par locale, et brouillons prêts à publier. Mis à jour le {date}.',
          { date: formatDate(data.generatedAt, { dateStyle: 'long', timeStyle: 'short' }) }
        )}
        primaryAction={
          <Button variant="secondary" startIcon={<ArrowClockwise />} onClick={load} loading={loading}>
            {t('dashboard.refresh', 'Actualiser')}
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={8}>
          <RevealModeCard />
          <Grid.Root gap={4}>
            <Grid.Item col={3} s={6} xs={12}>
              <KpiCard icon={Feather} color="primary" value={data.totals.total} label={t('kpi.total', 'Articles (toutes locales)')} />
            </Grid.Item>
            <Grid.Item col={3} s={6} xs={12}>
              <KpiCard icon={Eye} color="success" value={data.totals.published} label={t('kpi.published', 'Publiés')} />
            </Grid.Item>
            <Grid.Item col={3} s={6} xs={12}>
              <KpiCard icon={Pencil} color="secondary" value={data.totals.draft} label={t('kpi.draft', 'Brouillons')} />
            </Grid.Item>
            <Grid.Item col={3} s={6} xs={12}>
              <KpiCard icon={Sparkle} color="alternative" value={data.totals.modified} label={t('kpi.modified', 'Modifiés depuis publication')} />
            </Grid.Item>
          </Grid.Root>

          <Section title={t('locales.title', 'Par locale')}>
            <Table colCount={5} rowCount={data.perLocale.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">{t('locales.locale', 'Locale')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('status.published', 'Publié')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('status.draft', 'Brouillon')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('status.modified', 'Modifié')}</Typography></Th>
                  <Th><Typography variant="sigma">{t('locales.total', 'Total')}</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.perLocale.map((locale) => (
                  <Tr key={locale.code}>
                    <Td>
                      <Flex gap={2} alignItems="center">
                        <Earth aria-hidden fill="neutral500" />
                        <Typography textColor="neutral800" fontWeight="semiBold">
                          {locale.name}
                        </Typography>
                        <Typography textColor="neutral600">({locale.code})</Typography>
                        {locale.isDefault ? (
                          <Badge>{t('locales.default', 'Par défaut')}</Badge>
                        ) : null}
                      </Flex>
                    </Td>
                    <Td><Typography textColor="neutral800">{locale.published}</Typography></Td>
                    <Td><Typography textColor="neutral800">{locale.draft}</Typography></Td>
                    <Td><Typography textColor="neutral800">{locale.modified}</Typography></Td>
                    <Td><Typography textColor="neutral800" fontWeight="bold">{locale.total}</Typography></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Section>

          <Section
            title={t('ready.title', 'Brouillons prêts à publier')}
            subtitle={t('ready.subtitle', 'Tous les critères obligatoires de la check-list sont remplis.')}
          >
            {data.readyToPublish.length === 0 ? (
              <Box background="neutral0" hasRadius shadow="tableShadow">
                <EmptyStateLayout
                  icon={<CheckCircle width="6.4rem" height="6.4rem" fill="neutral300" />}
                  content={t('ready.empty', 'Aucun brouillon prêt à publier pour le moment.')}
                />
              </Box>
            ) : (
              <Table colCount={6} rowCount={data.readyToPublish.length + 1}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">{t('table.title', 'Titre')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('locales.locale', 'Locale')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.status', 'Statut')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.tone', 'Ton')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.checklist', 'Check-list')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.actions', 'Actions')}</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.readyToPublish.map((doc) => (
                    <Tr key={`${doc.documentId}-${doc.locale}`}>
                      <Td><Typography textColor="neutral800" fontWeight="semiBold">{doc.title}</Typography></Td>
                      <Td><Typography textColor="neutral800">{doc.locale}</Typography></Td>
                      <Td><StatusBadge status={doc.status} /></Td>
                      <Td>
                        <Typography textColor={doc.tone ? 'neutral800' : 'neutral500'}>
                          {doc.tone ?? t('table.noTone', 'Non renseigné')}
                        </Typography>
                      </Td>
                      <Td>
                        <Badge backgroundColor="success100" textColor="success700">
                          {`${doc.checklist.done} / ${doc.checklist.total}`}
                        </Badge>
                      </Td>
                      <Td><OpenButton doc={doc} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Section>

          <Section
            title={t('todo.title', 'Brouillons à compléter')}
            subtitle={t('todo.subtitle', 'Critères obligatoires encore manquants avant publication.')}
          >
            {data.toComplete.length === 0 ? (
              <Box background="neutral0" hasRadius shadow="tableShadow">
                <EmptyStateLayout
                  icon={<CheckCircle width="6.4rem" height="6.4rem" fill="neutral300" />}
                  content={t('todo.empty', 'Rien à compléter : bravo !')}
                />
              </Box>
            ) : (
              <Table colCount={5} rowCount={data.toComplete.length + 1}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">{t('table.title', 'Titre')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('locales.locale', 'Locale')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.status', 'Statut')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.missing', 'Manquant')}</Typography></Th>
                    <Th><Typography variant="sigma">{t('table.actions', 'Actions')}</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.toComplete.map((doc) => (
                    <Tr key={`${doc.documentId}-${doc.locale}`}>
                      <Td><Typography textColor="neutral800" fontWeight="semiBold">{doc.title}</Typography></Td>
                      <Td><Typography textColor="neutral800">{doc.locale}</Typography></Td>
                      <Td><StatusBadge status={doc.status} /></Td>
                      <Td>
                        <Flex gap={1} wrap="wrap">
                          {doc.checklist.items
                            .filter((item) => item.required && !item.ok)
                            .map((item) => (
                              <Badge key={item.key} backgroundColor="danger100" textColor="danger700">
                                {t(`checklist.${item.key}`, item.label)}
                              </Badge>
                            ))}
                        </Flex>
                      </Td>
                      <Td><OpenButton doc={doc} /></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Section>

          <Section
            title={t('tones.title', 'Répartition des tons éditoriaux')}
            subtitle={
              data.toneField
                ? t('tones.subtitle', 'Champ personnalisé « {field} » de l’article, toutes versions brouillon.', { field: data.toneField })
                : undefined
            }
          >
            <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
              {data.toneField ? (
                <Flex gap={2} wrap="wrap">
                  {data.tones.map((tone) => (
                    <Badge key={tone.label} backgroundColor="primary100" textColor="primary700">
                      {`${tone.label} : ${tone.count}`}
                    </Badge>
                  ))}
                </Flex>
              ) : (
                <Typography textColor="neutral600">
                  {t(
                    'tones.missing',
                    'Le champ personnalisé « Ton éditorial » n’est pas encore utilisé par Article. Ajoutez-le depuis le Content-Type Builder, onglet Personnalisé.'
                  )}
                </Typography>
              )}
            </Box>
          </Section>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

export { DashboardPage };
