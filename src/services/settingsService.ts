import { db } from '@/lib/db';
import { UserSettings } from '@/types';

/**
 * Centralized Settings Service
 * Manages user preferences with persistent storage (IndexedDB + localStorage fallback)
 */

const DEFAULT_SETTINGS: UserSettings = {
  voiceEnabled: true,
  hintsEnabled: false,
  autoFinishEnabled: false,
  apiKey: '',
  baseUrl: '',
  defaultModel: '',
};

/**
 * Load user settings from database
 * Falls back to localStorage for API keys (legacy support)
 */
export async function loadUserSettings(): Promise<UserSettings> {
  try {
    // Load from IndexedDB first
    const storedDB = await db.userSettings.orderBy('id').first();

    // Fallback to localStorage for API keys (migration path)
    const localApiKey = localStorage.getItem('gemini_api_key') || '';
    const localBaseUrl = localStorage.getItem('custom_base_url') || '';
    const localModelId = localStorage.getItem('custom_model_id') || '';

    if (storedDB) {
      return {
        ...storedDB,
        apiKey: storedDB.apiKey || localApiKey,
        baseUrl: storedDB.baseUrl || localBaseUrl,
        defaultModel: storedDB.defaultModel || localModelId,
      };
    }

    // No DB record found, return defaults + localStorage
    return {
      ...DEFAULT_SETTINGS,
      apiKey: localApiKey,
      baseUrl: localBaseUrl,
      defaultModel: localModelId,
    };
  } catch (error) {
    console.error('Failed to load settings from DB:', error);
    // Fallback to localStorage only
    return {
      ...DEFAULT_SETTINGS,
      apiKey: localStorage.getItem('gemini_api_key') || '',
      baseUrl: localStorage.getItem('custom_base_url') || '',
      defaultModel: localStorage.getItem('custom_model_id') || '',
    };
  }
}

/**
 * Save user settings to database and localStorage
 */
export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  try {
    // 1. Save critical keys to localStorage (legacy support & syncService compatibility)
    if (settings.apiKey?.trim()) {
      localStorage.setItem('gemini_api_key', settings.apiKey.trim());
    }
    if (settings.baseUrl?.trim()) {
      localStorage.setItem('custom_base_url', settings.baseUrl.trim());
    } else {
      localStorage.removeItem('custom_base_url');
    }
    if (settings.defaultModel?.trim()) {
      localStorage.setItem('custom_model_id', settings.defaultModel.trim());
    } else {
      localStorage.removeItem('custom_model_id');
    }

    // 2. Save to IndexedDB
    const dbRecord: UserSettings = {
      voiceEnabled: settings.voiceEnabled ?? true,
      hintsEnabled: settings.hintsEnabled ?? false,
      autoFinishEnabled: settings.autoFinishEnabled ?? false,
      apiKey: settings.apiKey || '',
      githubUsername: settings.githubUsername || '',
      githubToken: settings.githubToken || '',
      defaultModel: settings.defaultModel || '',
      baseUrl: settings.baseUrl || '',
    };

    // Check if a settings record already exists
    const existingSettings = await db.userSettings.orderBy('id').first();

    if (existingSettings?.id) {
      // Update the existing record
      await db.userSettings.update(existingSettings.id, dbRecord);
      return { ...dbRecord, id: existingSettings.id };
    } else {
      // Create a new record if none exists
      const id = await db.userSettings.add(dbRecord);
      return { ...dbRecord, id };
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get a specific setting value
 */
export async function getSetting<K extends keyof UserSettings>(key: K): Promise<UserSettings[K]> {
  const settings = await loadUserSettings();
  return settings[key];
}

/**
 * Update a specific setting
 */
export async function updateSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  const settings = await loadUserSettings();
  settings[key] = value;
  await saveUserSettings(settings);
}

/**
 * Load settings synchronously from localStorage (fallback for immediate access)
 * Use this sparingly - prefer async loadUserSettings() for full data
 */
export function loadSettingsSync(): Partial<UserSettings> {
  return {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    baseUrl: localStorage.getItem('custom_base_url') || '',
    defaultModel: localStorage.getItem('custom_model_id') || '',
  };
}

/**
 * Subscribe to settings changes
 * Returns unsubscribe function
 */
export function subscribeToSettings(callback: (settings: UserSettings) => void): () => void {
  let isSubscribed = true;

  const checkForChanges = async () => {
    while (isSubscribed) {
      const settings = await loadUserSettings();
      callback(settings);
      // Check every 2 seconds (you can adjust this)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  checkForChanges();

  return () => {
    isSubscribed = false;
  };
}
