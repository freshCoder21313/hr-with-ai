import { db } from '@/lib/db';
import { UserSettings, AIModelProvider } from '@/types';
import {
  migrateLegacySettings,
  mirrorActiveProfileToLocalStorage,
  normalizeUserSettings,
} from '@/services/ai/aiProfileService';
import { logger } from '@/lib/logger';

/**
 * Centralized Settings Service
 * Manages user preferences with persistent storage (IndexedDB + localStorage fallback)
 */

const DEFAULT_SETTINGS: UserSettings = {
  hintsEnabled: false,
  autoFinishEnabled: false,
  apiKey: '',
  baseUrl: '',
  defaultModel: '',
  provider: 'google',
  aiProfiles: [],
  activeAIProfileId: undefined,
  aiFallbackProfileIds: [],
};

// Singleton promise for in-flight migration
let migrationPromise: Promise<UserSettings> | null = null;

/**
 * Load user settings from database
 * Falls back to localStorage for API keys (legacy support)
 */
export async function loadUserSettings(): Promise<UserSettings> {
  if (migrationPromise) return migrationPromise;
  
  migrationPromise = (async () => {
    try {
      // Load from IndexedDB first
      const storedDB = await db.userSettings.orderBy('id').first();

      // Fallback to localStorage for API keys (migration path)
      const localApiKey = localStorage.getItem('gemini_api_key') || '';
      const localBaseUrl = localStorage.getItem('custom_base_url') || '';
      const localModelId = localStorage.getItem('custom_model_id') || '';
      const localProvider = (localStorage.getItem('ai_provider') as AIModelProvider) || 'google';

      let settings: UserSettings;

      if (storedDB) {
        settings = {
          ...storedDB,
          apiKey: storedDB.apiKey || localApiKey,
          baseUrl: storedDB.baseUrl || localBaseUrl,
          defaultModel: storedDB.defaultModel || localModelId,
          provider: storedDB.provider || localProvider,
        };
      } else {
        // No DB record found, return defaults + localStorage
        settings = {
          ...DEFAULT_SETTINGS,
          apiKey: localApiKey,
          baseUrl: localBaseUrl,
          defaultModel: localModelId,
          provider: localProvider,
        };
      }

      // Migrate and Normalize
      const migrated = migrateLegacySettings(settings);

      // Persist migration once if needed
      const needsSave = !storedDB || JSON.stringify(storedDB.aiProfiles) !== JSON.stringify(migrated.aiProfiles);
      
      if (needsSave) {
        // Save without recursive loadUserSettings
        await persistSettings(migrated);
      } else {
        mirrorActiveProfileToLocalStorage(migrated);
      }

      return migrated;
    } catch (error) {
      logger.error('Failed to load settings from DB:', error);
      // Fallback to localStorage only
      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        apiKey: localStorage.getItem('gemini_api_key') || '',
        baseUrl: localStorage.getItem('custom_base_url') || '',
        defaultModel: localStorage.getItem('custom_model_id') || '',
        provider: (localStorage.getItem('ai_provider') as AIModelProvider) || 'google',
      };
      const migrated = migrateLegacySettings(settings);
      mirrorActiveProfileToLocalStorage(migrated);
      return migrated;
    } finally {
      migrationPromise = null;
    }
  })();

  return migrationPromise;
}

/**
 * Persists settings to DB and localStorage without normalization (used internally by load)
 */
async function persistSettings(settings: UserSettings): Promise<UserSettings> {
  mirrorActiveProfileToLocalStorage(settings);

  const dbRecord: UserSettings = {
    hintsEnabled: settings.hintsEnabled ?? false,
    autoFinishEnabled: settings.autoFinishEnabled ?? false,
    forceToolsEnabled: settings.forceToolsEnabled ?? false,
    apiKey: settings.apiKey || '',
    githubUsername: settings.githubUsername || '',
    githubToken: settings.githubToken || '',
    defaultModel: settings.defaultModel || '',
    modelId: settings.modelId,
    baseUrl: settings.baseUrl || '',
    provider: settings.provider || 'google',
    maxRetries: settings.maxRetries,
    retryDelay: settings.retryDelay,
    retryOnTimeout: settings.retryOnTimeout,
    retryOnRateLimit: settings.retryOnRateLimit,
    defaultVoiceSettings: settings.defaultVoiceSettings,
    googleCloudApiKey: settings.googleCloudApiKey,
    elevenLabsApiKey: settings.elevenLabsApiKey,
    deepgramApiKey: settings.deepgramApiKey,
    aiProfiles: settings.aiProfiles,
    activeAIProfileId: settings.activeAIProfileId,
    aiFallbackProfileIds: settings.aiFallbackProfileIds,
  };

  const existingSettings = await db.userSettings.orderBy('id').first();
  if (existingSettings?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.userSettings.update(existingSettings.id, dbRecord as any);
    return { ...dbRecord, id: existingSettings.id };
  } else {
    const id = await db.userSettings.add(dbRecord);
    return { ...dbRecord, id };
  }
}

/**
 * Save user settings to database and localStorage
 */
export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  try {
    // Normalize before saving
    const normalized = normalizeUserSettings(settings);
    return await persistSettings(normalized);
  } catch (error) {
    logger.error('Failed to save settings:', error);
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
    provider: (localStorage.getItem('ai_provider') as AIModelProvider) || 'google',
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
