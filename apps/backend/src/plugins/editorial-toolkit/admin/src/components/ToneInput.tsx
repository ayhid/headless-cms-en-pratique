import * as React from 'react';

import { Box, Field, Flex, Typography } from '@strapi/design-system';
import { Cross, EmotionHappy, Information, Lightbulb, Rocket } from '@strapi/icons';
import { useField } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { TONES, type ToneKey } from '../../../shared/constants';
import { getTranslation } from '../utils/getTranslation';

/*
 * Input of the "Ton éditorial" custom field. The stored value is a plain string
 * (native `string` type), this component only changes how it is picked.
 * Built with @strapi/design-system tokens only (colors, spacing, radius, focus ring),
 * so it reads like a core input.
 */

const ICONS: Record<ToneKey, React.ComponentType<any>> = {
  factuel: Information,
  pedagogique: Lightbulb,
  enthousiaste: Rocket,
  decale: EmotionHappy,
};

type ToneInputProps = {
  name: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  labelAction?: React.ReactNode;
  attribute?: { required?: boolean };
};

const ToneInput = React.forwardRef<HTMLDivElement, ToneInputProps>(
  ({ name, label, hint, required, disabled, labelAction }, ref) => {
    const { formatMessage } = useIntl();
    const field = useField<string | null>(name);
    const value = field.value ?? null;

    const select = (next: string | null) => {
      if (disabled) return;
      field.onChange(name, next);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
      if (move === 0) return;
      event.preventDefault();
      const nextIndex = (index + move + TONES.length) % TONES.length;
      select(TONES[nextIndex].value);
      const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
      buttons?.[nextIndex]?.focus();
    };

    const selectedHint = TONES.find((tone) => tone.value === value);

    return (
      <Field.Root name={name} id={name} error={field.error} hint={hint} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Field.Label action={labelAction}>{label}</Field.Label>
          <Flex
            ref={ref}
            role="radiogroup"
            aria-label={typeof label === 'string' ? label : formatMessage({ id: getTranslation('tone.label'), defaultMessage: 'Ton éditorial' })}
            gap={2}
            wrap="wrap"
          >
            {TONES.map((tone, index) => {
              const Icon = ICONS[tone.value];
              const checked = value === tone.value;
              return (
                <Box
                  key={tone.value}
                  tag="button"
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked || (value === null && index === 0) ? 0 : -1}
                  disabled={disabled}
                  onClick={() => select(tone.value)}
                  onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, index)}
                  paddingTop={2}
                  paddingBottom={2}
                  paddingLeft={4}
                  paddingRight={4}
                  hasRadius
                  borderStyle="solid"
                  borderWidth="1px"
                  borderColor={checked ? 'primary600' : 'neutral200'}
                  background={checked ? 'primary100' : 'neutral0'}
                  color={checked ? 'primary600' : 'neutral800'}
                  cursor={disabled ? 'not-allowed' : 'pointer'}
                  shadow={checked ? undefined : 'filterShadow'}
                  style={{ opacity: disabled ? 0.6 : 1, transition: 'background 120ms, border-color 120ms' }}
                >
                  <Flex gap={2} alignItems="center">
                    <Icon aria-hidden width="1.6rem" height="1.6rem" fill={checked ? 'primary600' : 'neutral500'} />
                    <Typography variant="omega" fontWeight="semiBold" textColor={checked ? 'primary600' : 'neutral800'}>
                      {formatMessage({ id: getTranslation(`tone.${tone.value}`), defaultMessage: tone.label })}
                    </Typography>
                  </Flex>
                </Box>
              );
            })}
            {value !== null && !disabled ? (
              <Box
                tag="button"
                type="button"
                onClick={() => select(null)}
                paddingTop={2}
                paddingBottom={2}
                paddingLeft={3}
                paddingRight={3}
                hasRadius
                background="transparent"
                borderStyle="none"
                cursor="pointer"
                aria-label={formatMessage({ id: getTranslation('tone.clear'), defaultMessage: 'Effacer le ton' })}
              >
                <Flex gap={1} alignItems="center">
                  <Cross aria-hidden width="1.2rem" height="1.2rem" fill="neutral500" />
                  <Typography variant="pi" textColor="neutral600">
                    {formatMessage({ id: getTranslation('tone.clear'), defaultMessage: 'Effacer le ton' })}
                  </Typography>
                </Flex>
              </Box>
            ) : null}
          </Flex>
          {selectedHint ? (
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({ id: getTranslation(`tone.${selectedHint.value}.hint`), defaultMessage: selectedHint.hint })}
            </Typography>
          ) : (
            <Field.Hint />
          )}
          <Field.Error />
        </Flex>
      </Field.Root>
    );
  }
);

ToneInput.displayName = 'ToneInput';

export default ToneInput;
