import { AIProviderProfile, UserSettings, AIConfig } from '@/types';

export const LEGACY_DEFAULT_ID = 'legacy-default';

/**
 * Normalizes and migrates legacy settings to multi-provider profiles.
 * This is idempotent.
 */
export function migrateLegacySettings(settings: UserSettings): UserSettings {
  // If aiProfiles already exists, don't migrate again
  if (settings.aiProfiles && settings.aiProfiles.length > 0) {
    return normalizeUserSettings(settings);
  }

  const legacyProfiles: AIProviderProfile[] = [];

  // Migrate main AI provider
  if (settings.apiKey || settings.provider) {
    legacyProfiles.push({
      id: LEGACY_DEFAULT_ID,
      name: 'Default Profile',
      provider: settings.provider || 'google',
      apiKey: settings.apiKey || '',
      baseUrl: settings.baseUrl,
      modelIds: settings.defaultModel ? [settings.defaultModel] : [],
      enabled: true,
    });
  }

  const newSettings: UserSettings = {
    ...settings,
    aiProfiles: legacyProfiles,
    activeAIProfileId: legacyProfiles.length > 0 ? LEGACY_DEFAULT_ID : undefined,
    aiFallbackProfileIds: [],
  };

  return normalizeUserSettings(newSettings);
}

/**
 * Enforces invariants on UserSettings and its profiles.
 */
export function normalizeUserSettings(settings: UserSettings): UserSettings {
  const profiles = settings.aiProfiles || [];
  const normalizedProfiles: AIProviderProfile[] = [];
  const seenNames = new Set<string>();

  for (const profile of profiles) {
    // Enforce unique names case-insensitively
    const originalName = profile.name.trim() || 'Unnamed Profile';
    let uniqueName = originalName;
    let nameKey = uniqueName.toLowerCase();

    if (seenNames.has(nameKey)) {
      let counter = 1;
      while (seenNames.has(`${nameKey} ${counter}`)) {
        counter++;
      }
      uniqueName = `${originalName} ${counter}`;
      nameKey = uniqueName.toLowerCase();
    }
    seenNames.add(nameKey);

    normalizedProfiles.push({
      ...profile,
      id: profile.id || crypto.randomUUID(),
      name: uniqueName,
      modelIds: Array.from(new Set(profile.modelIds || [])),
    });
  }

  // Active profile must exist and be enabled
  let activeId = settings.activeAIProfileId;
  let activeProfile = normalizedProfiles.find((p) => p.id === activeId);

  if (!activeProfile && normalizedProfiles.length > 0) {
    // Try to find first enabled profile
    activeProfile = normalizedProfiles.find((p) => p.enabled) || normalizedProfiles[0];
    activeId = activeProfile.id;
  }

  if (activeProfile && !activeProfile.enabled) {
    // If active is disabled, try to find another enabled one
    const firstEnabled = normalizedProfiles.find((p) => p.enabled);
    if (firstEnabled) {
      activeId = firstEnabled.id;
    }
  }

  // Fallback list invariants: exclude active, disabled, missing, and deduped
  const fallbackIds = (settings.aiFallbackProfileIds || [])
    .filter((id) => id !== activeId)
    .filter((id) => {
      const p = normalizedProfiles.find((prof) => prof.id === id);
      return p && p.enabled;
    });

  return {
    ...settings,
    aiProfiles: normalizedProfiles,
    activeAIProfileId: activeId,
    aiFallbackProfileIds: Array.from(new Set(fallbackIds)),
  };
}

/**
 * Gets the currently active AI config marker for runtime resolution.
 */
export function getActiveProfileConfig(settings: UserSettings): AIConfig | null {
  const activeId = settings.activeAIProfileId;
  if (!activeId || !settings.aiProfiles) return null;

  const profile = settings.aiProfiles.find((p) => p.id === activeId);
  if (!profile || !profile.enabled) return null;

  return {
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    modelId: profile.modelIds[0],
    provider: profile.provider,
    profileId: profile.id,
    source: 'active-profile',
  };
}

/**
 * Mirrors active profile to existing localStorage keys for backward compatibility.
 */
export function mirrorActiveProfileToLocalStorage(settings: UserSettings): void {
  const activeConfig = getActiveProfileConfig(settings);

  if (activeConfig) {
    localStorage.setItem('gemini_api_key', activeConfig.apiKey || '');
    if (activeConfig.baseUrl) {
      localStorage.setItem('custom_base_url', activeConfig.baseUrl);
    } else {
      localStorage.removeItem('custom_base_url');
    }
    if (activeConfig.modelId) {
      localStorage.setItem('custom_model_id', activeConfig.modelId);
    } else {
      localStorage.removeItem('custom_model_id');
    }
    localStorage.setItem('ai_provider', activeConfig.provider);
    localStorage.setItem('ai_active_profile_id', activeConfig.profileId || '');
  } else {
    // Clear all mirror keys if no usable active config
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('custom_base_url');
    localStorage.removeItem('custom_model_id');
    localStorage.removeItem('ai_provider');
    localStorage.removeItem('ai_active_profile_id');
  }
}

/**
 * Strips nested apiKey property for safe export.
 */
export function toSafeSyncProfiles(
  profiles: AIProviderProfile[]
): Omit<AIProviderProfile, 'apiKey'>[] {
  return profiles.map(({ apiKey: _apiKey, ...rest }) => rest);
}

/**
 * Settings fields that an untrusted import (backup JSON / cloud restore) is
 * never allowed to set. This covers secrets AND endpoint-influencing fields:
 * an imported `baseUrl` would redirect the user's real API key, resume text
 * and interview transcripts to an attacker-controlled host.
 */
const IMPORT_PROTECTED_FIELDS = [
  'apiKey',
  'githubToken',
  'googleCloudApiKey',
  'elevenLabsApiKey',
  'deepgramApiKey',
  'baseUrl',
] as const satisfies readonly (keyof UserSettings)[];

/**
 * Strips secrets and endpoint overrides from imported settings.
 * Imported settings are treated as untrusted input (see docs/SECURITY.md).
 */
export function stripImportProtectedFields(settings: UserSettings): UserSettings {
  const safe: UserSettings = { ...settings };
  for (const field of IMPORT_PROTECTED_FIELDS) {
    delete safe[field];
  }
  return safe;
}

/**
 * Merges imported profiles. Imported profiles are untrusted: local API keys are
 * preserved for matching IDs, and the endpoint (`baseUrl`) is never taken from
 * an import — otherwise a crafted backup would exfiltrate the local key to an
 * attacker host. Newly imported profiles stay disabled and keyless.
 */
export function mergeImportedProfiles(
  localProfiles: AIProviderProfile[],
  importedProfiles: AIProviderProfile[]
): AIProviderProfile[] {
  const merged: AIProviderProfile[] = [...localProfiles];

  for (const imported of importedProfiles) {
    const localIndex = merged.findIndex((p) => p.id === imported.id);
    if (localIndex > -1) {
      // Preserve local apiKey and baseUrl
      merged[localIndex] = {
        ...imported,
        apiKey: merged[localIndex].apiKey,
        baseUrl: merged[localIndex].baseUrl,
      };
    } else {
      // New profile with no key becomes disabled
      merged.push({
        ...imported,
        apiKey: '',
        baseUrl: undefined,
        enabled: false,
      });
    }
  }

  return merged;
}
