import type { UserSettings } from '@/types';

/**
 * Broadcast when user settings are persisted, so long-lived surfaces (e.g. a
 * running interview room) can re-read them live instead of only on next mount.
 */
export const SETTINGS_CHANGED_EVENT = 'SETTINGS_CHANGED';

export const emitSettingsChanged = (settings: UserSettings) => {
  window.dispatchEvent(new CustomEvent<UserSettings>(SETTINGS_CHANGED_EVENT, { detail: settings }));
};

export const subscribeToSettingsChanged = (callback: (settings: UserSettings) => void) => {
  const handler = (event: Event) => {
    callback((event as CustomEvent<UserSettings>).detail);
  };
  window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
};
