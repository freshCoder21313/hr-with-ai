import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { AIProviderProfile, UserSettings, AIModelProvider } from '@/types';
import { loadUserSettings, saveUserSettings } from '@/services/core/settingsService';
import { normalizeUserSettings } from '@/services/ai/aiProfileService';
import { testAIConnection, fetchProviderModels } from '@/services/ai/aiConfigService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIProviderProfilesEditorProps {
  onSave?: (settings: UserSettings) => void;
  className?: string;
}

export const AIProviderProfilesEditor: React.FC<AIProviderProfilesEditorProps> = ({
  onSave,
  className,
}) => {
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

      // If disabling an active profile, we'll need to handle that on save or normalization
      // But for UI responsiveness, we keep it as is.

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

  if (!settings) return <div className="p-8 text-center">Loading profiles...</div>;

  return (
    <div className={cn('flex flex-col h-full space-y-4', className)}>
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
        {/* Left Side: Profile List */}
        <div className="w-full md:w-64 flex flex-col space-y-2 border-r pr-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Profiles</h3>
            <Button variant="ghost" size="icon" onClick={handleAddProfile} title="Add new profile">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={cn(
                  'group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                  editingProfileId === profile.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
                onClick={() => setEditingProfileId(profile.id)}
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{profile.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {profile.provider}
                    </span>
                    {!profile.enabled && (
                      <Badge variant="outline" className="text-[8px] h-3 px-1">
                        Disabled
                      </Badge>
                    )}
                    {activeId === profile.id && (
                      <Badge className="text-[8px] h-3 px-1 bg-green-500 hover:bg-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateProfile(profile);
                    }}
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProfile(profile.id);
                    }}
                    disabled={activeId === profile.id}
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              Fallback Chain
              <span title="If the active profile fails, these will be tried in order.">
                <AlertCircle className="w-3 h-3 text-muted-foreground" />
              </span>
            </h3>

            <div className="space-y-1">
              {fallbackIds.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">
                  No fallback profiles configured.
                </p>
              )}
              {fallbackIds.map((fid, idx) => {
                const profile = profiles.find((p) => p.id === fid);
                if (!profile) return null;
                return (
                  <div
                    key={fid}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-[11px]"
                  >
                    <span className="truncate max-w-[100px]">{profile.name}</span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleReorderFallback(fid, 'up')}
                        disabled={idx === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleReorderFallback(fid, 'down')}
                        disabled={idx === fallbackIds.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive"
                        onClick={() => handleToggleFallback(fid)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Editor */}
        <div className="flex-1 overflow-y-auto pr-2">
          {editingProfile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeId === editingProfile.id ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleSetActive(editingProfile.id)}
                    disabled={activeId === editingProfile.id || !editingProfile.enabled}
                  >
                    {activeId === editingProfile.id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Active
                      </>
                    ) : (
                      'Set as Active'
                    )}
                  </Button>
                  <div className="flex items-center gap-2 ml-2">
                    <Label htmlFor="profile-enabled" className="text-xs">
                      Enabled
                    </Label>
                    <Switch
                      id="profile-enabled"
                      checked={editingProfile.enabled}
                      onCheckedChange={(c) =>
                        handleUpdateProfile(editingProfile.id, { enabled: c })
                      }
                      disabled={activeId === editingProfile.id}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Profile Name</Label>
                  <Input
                    value={editingProfile.name}
                    onChange={(e) =>
                      handleUpdateProfile(editingProfile.id, { name: e.target.value })
                    }
                    placeholder="e.g., Gemini Pro (Work)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={editingProfile.provider}
                    onValueChange={(v) =>
                      handleUpdateProfile(editingProfile.id, { provider: v as AIModelProvider })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI Compatible</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>API Key</Label>
                  <a
                    href={
                      editingProfile.provider === 'google'
                        ? 'https://aistudio.google.com/app/apikey'
                        : editingProfile.provider === 'openrouter'
                          ? 'https://openrouter.ai/keys'
                          : editingProfile.provider === 'anthropic'
                            ? 'https://console.anthropic.com/settings/keys'
                            : 'https://platform.openai.com/api-keys'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    Get Key <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
                <Input
                  type="password"
                  value={editingProfile.apiKey}
                  onChange={(e) =>
                    handleUpdateProfile(editingProfile.id, { apiKey: e.target.value })
                  }
                  placeholder={editingProfile.provider === 'google' ? 'AIzaSy...' : 'sk-...'}
                />
              </div>

              {(editingProfile.provider === 'openai' ||
                editingProfile.provider === 'openrouter' ||
                editingProfile.provider === 'google') && (
                <div className="space-y-2">
                  <Label>
                    Base URL{' '}
                    {editingProfile.provider === 'openai' && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    value={editingProfile.baseUrl || ''}
                    onChange={(e) =>
                      handleUpdateProfile(editingProfile.id, { baseUrl: e.target.value })
                    }
                    placeholder={
                      editingProfile.provider === 'openrouter'
                        ? 'https://openrouter.ai/api/v1'
                        : editingProfile.provider === 'google'
                          ? 'https://generativelanguage.googleapis.com'
                          : 'https://api.openai.com/v1'
                    }
                  />
                  {editingProfile.baseUrl && (
                    <p className="text-[10px] text-orange-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Security: Only use URLs you trust.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Model IDs (One per line, first is primary)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] gap-1 px-2"
                    onClick={() => handleFetchModels(editingProfile)}
                    disabled={fetchingModels[editingProfile.id]}
                  >
                    {fetchingModels[editingProfile.id] ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Fetch Models
                  </Button>
                </div>

                {fetchedModels[editingProfile.id] &&
                  fetchedModels[editingProfile.id].length > 0 && (
                    <div className="bg-muted/30 border border-border rounded-md p-2 mb-2 max-h-40 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Available Models
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[10px]"
                          onClick={() =>
                            handleAddModels(editingProfile.id, fetchedModels[editingProfile.id])
                          }
                        >
                          Add All
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {fetchedModels[editingProfile.id].map((mid) => {
                          const isAdded = editingProfile.modelIds.includes(mid);
                          return (
                            <Badge
                              key={mid}
                              variant={isAdded ? 'secondary' : 'outline'}
                              className={cn(
                                'text-[9px] py-0 cursor-pointer hover:bg-primary/20 transition-colors',
                                isAdded && 'opacity-60 cursor-default'
                              )}
                              onClick={() => !isAdded && handleAddModels(editingProfile.id, [mid])}
                            >
                              {mid}
                              {!isAdded && <Plus className="w-2 h-2 ml-1" />}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                <Textarea
                  value={editingProfile.modelIds.join('\n')}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    handleUpdateProfile(editingProfile.id, { modelIds: ids });
                  }}
                  placeholder={
                    editingProfile.provider === 'google'
                      ? 'gemini-1.5-pro\ngemini-1.5-flash'
                      : editingProfile.provider === 'openrouter'
                        ? 'google/gemini-pro-1.5\nanthropic/claude-3-sonnet'
                        : 'gpt-4o\ngpt-4-turbo'
                  }
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Test Configuration</span>
                    <span className="text-[10px] text-muted-foreground">
                      Verify this profile works without fallback.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(editingProfile)}
                    disabled={isTesting === editingProfile.id}
                  >
                    {isTesting === editingProfile.id ? (
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 mr-2" />
                    )}
                    Run Test
                  </Button>
                </div>

                {activeId !== editingProfile.id && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">Use as Fallback</span>
                      <span className="text-[10px] text-muted-foreground">
                        Add to fallback chain if active profile fails.
                      </span>
                    </div>
                    <Switch
                      checked={fallbackIds.includes(editingProfile.id)}
                      onCheckedChange={() => handleToggleFallback(editingProfile.id)}
                      disabled={!editingProfile.enabled}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground italic">
              Select or add a profile to start editing.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Alert className="flex-1 py-2 bg-primary/5 border-primary/10">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <AlertDescription className="text-[10px] leading-tight">
            Keys stay <strong>on this device</strong>. They are sent only to the configured Base
            URLs.
          </AlertDescription>
        </Alert>
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
          {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : 'Save All'}
        </Button>
      </div>
    </div>
  );
};
