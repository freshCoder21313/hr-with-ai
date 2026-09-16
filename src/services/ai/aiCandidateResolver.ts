import { AIConfig, AIProviderProfile } from '@/types';
import { loadUserSettings } from '@/services/core/settingsService';
import { AIProviderError } from './aiErrors';

export interface CandidateConfig extends AIConfig {
  profileName?: string;
  isFallback?: boolean;
}

/**
 * Resolves a marker AIConfig into a prioritized list of candidates based on user settings.
 */
export const resolveCandidates = async (config: AIConfig): Promise<CandidateConfig[]> => {
  // Explicit bypass: if source is 'explicit' or missing, return single candidate
  if (config.source !== 'active-profile') {
    return [{ ...config }];
  }

  try {
    const settings = await loadUserSettings();
    const profiles = settings.aiProfiles || [];
    const activeProfileId = settings.activeAIProfileId;
    const fallbackProfileIds = settings.aiFallbackProfileIds || [];

    const candidates: CandidateConfig[] = [];
    const seenCandidates = new Set<string>();

    const addProfileCandidates = (profile: AIProviderProfile, isFallback: boolean) => {
      if (!profile.enabled || !profile.apiKey) return;

      // If no models specified, use provider default
      const modelIds = profile.modelIds.length > 0 ? profile.modelIds : [undefined];

      for (const modelId of modelIds) {
        // Deduplication key: provider + baseUrl + modelId + profileId
        const key = `${profile.provider}:${profile.baseUrl || 'default'}:${modelId || 'default'}:${profile.id}`;
        if (seenCandidates.has(key)) continue;

        candidates.push({
          apiKey: profile.apiKey,
          baseUrl: profile.baseUrl,
          modelId: modelId,
          provider: profile.provider,
          profileId: profile.id,
          profileName: profile.name,
          isFallback,
          source: 'active-profile',
        });
        seenCandidates.add(key);
      }
    };

    // 1. Resolve Active Profile first
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    if (activeProfile) {
      addProfileCandidates(activeProfile, false);
    }

    // 2. Resolve configured fallbacks in order
    for (const fallbackId of fallbackProfileIds) {
      if (fallbackId === activeProfileId) continue; // Safety check
      const fallbackProfile = profiles.find((p) => p.id === fallbackId);
      if (fallbackProfile) {
        addProfileCandidates(fallbackProfile, true);
      }
    }

    // If no candidates resolved (e.g. all disabled/missing), throw configuration error
    if (candidates.length === 0) {
      throw new AIProviderError(
        'No enabled AI profiles found. Please configure your AI settings.',
        'invalid_request',
        'google', // Generic fallback provider for error typing
        undefined,
        false,
        false
      );
    }

    return candidates;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;

    // On failure, throw safe configuration error
    throw new AIProviderError(
      'Failed to resolve AI configuration. Check your settings.',
      'invalid_request',
      'google',
      undefined,
      false,
      false,
      error
    );
  }
};
