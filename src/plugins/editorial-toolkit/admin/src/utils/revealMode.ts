import * as React from 'react';

import { PLUGIN_ID } from '../pluginId';

/*
 * "Mode révélateur" state: shows or hides the labels injected in the Content Manager
 * injection zones (see components/InjectionZoneReveal.tsx).
 *
 * Stored in localStorage so it survives a reload, off by default. It is kept in sync:
 * - between tabs, through the native `storage` event (fired in the OTHER tabs only);
 * - inside the same tab, through a custom event, because `storage` is never fired in the
 *   tab that wrote the value.
 * No rebuild, no reload and no Strapi restart needed: the labels appear immediately.
 */

export const REVEAL_STORAGE_KEY = `${PLUGIN_ID}:reveal-injection-zones`;
const REVEAL_EVENT = `${PLUGIN_ID}:reveal-injection-zones-change`;

/** Reads the stored value; any storage error (private window, blocked site data) means "off". */
export const readRevealMode = (): boolean => {
  try {
    return window.localStorage.getItem(REVEAL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeRevealMode = (enabled: boolean): void => {
  try {
    if (enabled) {
      window.localStorage.setItem(REVEAL_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(REVEAL_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable: the switch still works for the current tab through the event below.
  }
  window.dispatchEvent(new CustomEvent<boolean>(REVEAL_EVENT, { detail: enabled }));
};

/** Current value of the reveal mode, re-rendered on every change (same tab or other tab). */
export const useRevealMode = (): [boolean, (enabled: boolean) => void] => {
  const [enabled, setEnabled] = React.useState<boolean>(readRevealMode);

  React.useEffect(() => {
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setEnabled(typeof detail === 'boolean' ? detail : readRevealMode());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === REVEAL_STORAGE_KEY) {
        setEnabled(readRevealMode());
      }
    };
    window.addEventListener(REVEAL_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    // The value may have changed between the first render and this effect.
    setEnabled(readRevealMode());
    return () => {
      window.removeEventListener(REVEAL_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const update = React.useCallback((next: boolean) => {
    setEnabled(next);
    writeRevealMode(next);
  }, []);

  return [enabled, update];
};
