import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { AIProviderProfile, UserSettings, AIModelProvider } from '@/types';
import { loadUserSettings, saveUserSettings } from '@/services/core/settingsService';
import { normalizeUserSettings } from '@/services/ai/aiProfileService';
import { testAIConnection, fetchProviderModels } from '@/services/ai/aiConfigService';

export function useAIProviderEditor(onSave?: (settings: UserSettings) => void) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [fetchedModels, setFetchedModels] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const stored = await loadUserSettings();
      const normalized = normalizeUserSettings(stored);
      setSettings(normalized);
      if (normalized.activeAIProfileId) {
        setEditingProfileId(normalized.activeAIProfileId);
      } else if (normalized.aiProfiles && normalized.aiProfiles.length > 0) {
        setEditingProfileId(normalized.aiProfiles[0].id);
      }
    };
    init();
  }, []);

  const profiles = useMemo(() => settings?.aiProfiles || [], [settings?.aiProfiles]);
  const activeId = settings?.activeAIProfileId;
  const fallbackIds = useMemo(
    () => settings?.aiFallbackProfileIds || [],
    [settings?.aiFallbackProfileIds]
  );

  const editingProfile = useMemo(
    () => profiles.find((p) => p.id === editingProfileId),
    [profiles, editingProfileId]
  );

  // Reset fetched models when config changes to avoid stale results
  useEffect(() => {
    if (editingProfileId) {
      setFetchedModels((prev) => {
        if (!prev[editingProfileId]) return prev;
        const next = { ...prev };
        delete next[editingProfileId];
        return next;
      });
    }
  }, [editingProfile?.provider, editingProfile?.apiKey, editingProfile?.baseUrl, editingProfileId]);

  const handleAddProfile = () => {
    const newProfile: AIProviderProfile = {
      id: crypto.randomUUID(),
      name: `New Profile ${profiles.length + 1}`,
      provider: 'google',
      apiKey: '',
      modelIds: [],
      enabled: true,
    };

    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        aiProfiles: [...(prev.aiProfiles || []), newProfile],
      };
    });
    setEditingProfileId(newProfile.id);
  };

  const handleDuplicateProfile = (profile: AIProviderProfile) => {
    const newProfile: AIProviderProfile = {
      ...profile,
      id: crypto.randomUUID(),
      name: `${profile.name} (Copy)`,
      enabled: true,
    };

    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        aiProfiles: [...(prev.aiProfiles || []), newProfile],
      };
    });
    setEditingProfileId(newProfile.id);
  };

  const handleDeleteProfile = (id: string) => {
    if (id === activeId) {
      toast.error('Cannot delete the active profile. Please set another profile as active first.');
      return;
    }

    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        aiProfiles: (prev.aiProfiles || []).filter((p) => p.id !== id),
        aiFallbackProfileIds: (prev.aiFallbackProfileIds || []).filter((fid) => fid !== id),
      };
    });

    if (editingProfileId === id) {
      setEditingProfileId(activeId || null);
    }
  };

  const handleSetActive = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (profile && !profile.enabled) {
      toast.error('Cannot set a disabled profile as active.');
      return;
    }

    setSettings((prev) => {
      if (!prev) return null;
      // Remove from fallback if it was there
      const newFallbackIds = (prev.aiFallbackProfileIds || []).filter((fid) => fid !== id);
      return {
        ...prev,
        activeAIProfileId: id,
        aiFallbackProfileIds: newFallbackIds,
      };
    });
  };

  const handleUpdateProfile = (id: string, updates: Partial<AIProviderProfile>) => {
    setSettings((prev) => {
      if (!prev) return null;
      const newProfiles = (prev.aiProfiles || []).map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );

      return {
        ...prev,
        aiProfiles: newProfiles,
      };
    });
  };

  const handleReorderFallback = (id: string, direction: 'up' | 'down') => {
    const index = fallbackIds.indexOf(id);
    if (index === -1) return;

    const newFallbackIds = [...fallbackIds];
    if (direction === 'up' && index > 0) {
      [newFallbackIds[index], newFallbackIds[index - 1]] = [
        newFallbackIds[index - 1],
        newFallbackIds[index],
      ];
    } else if (direction === 'down' && index < newFallbackIds.length - 1) {
      [newFallbackIds[index], newFallbackIds[index + 1]] = [
        newFallbackIds[index + 1],
        newFallbackIds[index],
      ];
    }

    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        aiFallbackProfileIds: newFallbackIds,
      };
    });
  };

  const handleToggleFallback = (id: string) => {
    if (id === activeId) return;

    setSettings((prev) => {
      if (!prev) return null;
      const isFallback = (prev.aiFallbackProfileIds || []).includes(id);
      let newFallbackIds: string[];

      if (isFallback) {
        newFallbackIds = (prev.aiFallbackProfileIds || []).filter((fid) => fid !== id);
      } else {
        newFallbackIds = [...(prev.aiFallbackProfileIds || []), id];
      }

      return {
        ...prev,
        aiFallbackProfileIds: newFallbackIds,
      };
    });
  };

  const handleTestConnection = async (profile: AIProviderProfile) => {
    if (!profile.apiKey && profile.provider !== 'google') {
      toast.error('API Key is required for testing.');
      return;
    }

    setIsTesting(profile.id);
    try {
      const config = {
        apiKey: profile.apiKey,
        baseUrl: profile.baseUrl,
        modelId: profile.modelIds[0],
        provider: profile.provider,
        source: 'explicit' as const,
      };

      await testAIConnection(config);
      toast.success(`Connection to ${profile.name} successful!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsTesting(null);
    }
  };

  const handleFetchModels = async (profile: AIProviderProfile) => {
    if (!profile.apiKey && profile.provider !== 'google') {
      toast.error('API Key is required to fetch models.');
      return;
    }
    if (profile.provider === 'openai' && !profile.baseUrl) {
      toast.error('Base URL is required for OpenAI-compatible provider.');
      return;
    }

    setFetchingModels((prev) => ({ ...prev, [profile.id]: true }));
    try {
      const config = {
        apiKey: profile.apiKey,
        baseUrl: profile.baseUrl,
        provider: profile.provider,
        source: 'explicit' as const,
      };

      const models = await fetchProviderModels(config);
      setFetchedModels((prev) => ({ ...prev, [profile.id]: models }));
      if (models.length === 0) {
        toast.info('No models found for this provider.');
      } else {
        toast.success(`Successfully fetched ${models.length} models.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch models');
    } finally {
      setFetchingModels((prev) => ({ ...prev, [profile.id]: false }));
    }
  };

  const handleAddModels = (id: string, newModelIds: string[]) => {
    setSettings((prev) => {
      if (!prev) return null;
      const profile = prev.aiProfiles?.find((p) => p.id === id);
      if (!profile) return prev;

      const currentIds = profile.modelIds || [];
      const combined = [...currentIds];

      for (const mid of newModelIds) {
        if (!combined.includes(mid)) {
          combined.push(mid);
        }
      }

      return {
        ...prev,
        aiProfiles: prev.aiProfiles?.map((p) => (p.id === id ? { ...p, modelIds: combined } : p)),
      };
    });
  };

  const validate = (settings: UserSettings): string | null => {
    if (!settings.aiProfiles || settings.aiProfiles.length === 0) {
      return 'At least one profile is required.';
    }

    const seenNames = new Set<string>();
    for (const p of settings.aiProfiles) {
      if (!p.name.trim()) return `Profile name cannot be empty.`;
      const nameKey = p.name.trim().toLowerCase();
      if (seenNames.has(nameKey)) return `Profile name "${p.name}" is not unique.`;
      seenNames.add(nameKey);

      if (p.enabled) {
        if (!p.apiKey && p.provider !== 'google') {
          return `API Key is required for enabled profile "${p.name}".`;
        }
        if (p.provider === 'openai' && !p.baseUrl) {
          return `Base URL is required for OpenAI-compatible provider in "${p.name}".`;
        }
      }
    }

    if (!settings.activeAIProfileId) {
      return 'An active profile must be selected.';
    }

    const active = settings.aiProfiles.find((p) => p.id === settings.activeAIProfileId);
    if (!active) return 'Selected active profile does not exist.';
    if (!active.enabled) return 'Active profile must be enabled.';

    return null;
  };

  const handleSave = async () => {
    if (!settings) return;

    const error = validate(settings);
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      const normalized = normalizeUserSettings(settings);
      const saved = await saveUserSettings(normalized);
      setSettings(normalized);
      toast.success('AI Profiles saved successfully.');
      if (onSave) onSave(saved);
    } catch (error) {
      console.error('Failed to save profiles:', error);
      toast.error('Failed to save profiles.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    editingProfileId,
    setEditingProfileId,
    isTesting,
    fetchingModels,
    fetchedModels,
    isSaving,
    profiles,
    activeId,
    fallbackIds,
    editingProfile,
    handleAddProfile,
    handleDuplicateProfile,
    handleDeleteProfile,
    handleSetActive,
    handleUpdateProfile,
    handleReorderFallback,
    handleToggleFallback,
    handleTestConnection,
    handleFetchModels,
    handleAddModels,
    handleSave,
  };
}
