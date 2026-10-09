import React, { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadUserSettings, saveUserSettings } from '@/services/core/settingsService';
import { UserSettings } from '@/types';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { toast } from 'sonner';
import { Settings2, Sparkles, RotateCcw } from 'lucide-react';

import { AIProviderProfilesEditor } from '@/features/settings/AIProviderProfilesEditor';
import { emitSettingsChanged } from '@/events/settingsEvents';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  initialTab?: string;
  /**
   * Optional per-instance callback fired after save. Independent of the global
   * SETTINGS_CHANGED broadcast, which every instance emits so a running
   * interview room re-reads settings live.
   */
  onSettingsChanged?: (settings: UserSettings) => void;
  /**
   * Element that opened the dialog. A controlled Dialog has no trigger of its
   * own, so Radix would send focus to <body>. Suppressing its default keeps
   * focus on the launcher; App re-asserts it on the next frame, after Radix's
   * teardown refocus has run.
   */
  restoreFocusTarget?: HTMLElement | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  defaultTab = 'general',
  initialTab,
  onSettingsChanged,
  restoreFocusTarget,
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    hintsEnabled: false,
    autoFinishEnabled: false,
    forceToolsEnabled: false,
    dynamicScenariosEnabled: false,
    apiKey: '',
    baseUrl: '',
    modelId: '',
    maxRetries: 3,
    retryDelay: 1000,
    retryOnTimeout: true,
    retryOnRateLimit: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  const resolvedDefaultTab = initialTab ?? defaultTab;
  const [activeTab, setActiveTab] = useState(resolvedDefaultTab);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (restoreFocusTarget) focusReturnRef.current = restoreFocusTarget;
  }, [restoreFocusTarget]);

  // Load settings on open
  useEffect(() => {
    if (open) {
      setActiveTab(resolvedDefaultTab);
      const loadSettings = async () => {
        try {
          const stored = await loadUserSettings();
          setSettings({
            ...stored,
            modelId: stored.defaultModel || '',
          });
        } catch (error) {
          logger.error('Failed to load settings:', error);
        } finally {
          setIsLoading(false);
        }
      };
      setIsLoading(true);
      loadSettings();
    }
  }, [open, resolvedDefaultTab]);

  const handleSave = async () => {
    try {
      const settingsToSave: UserSettings = {
        ...settings,
        defaultModel: settings.modelId || settings.defaultModel || '',
      };

      // Save using centralized service
      const savedSettings = await saveUserSettings(settingsToSave);

      // Update local state
      setSettings({
        ...savedSettings,
        modelId: savedSettings.defaultModel || '',
      });

      emitSettingsChanged(savedSettings);
      if (onSettingsChanged) onSettingsChanged(savedSettings);
      onOpenChange(false); // Close modal
    } catch (error) {
      logger.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    }
  };

  const handleManageProfiles = () => {
    setActiveTab('ai-profiles');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        onCloseAutoFocus={(e) => {
          const target = focusReturnRef.current;
          if (!target?.isConnected) return;
          e.preventDefault();
          target.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure interview behavior, retry policy, and AI provider profiles.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading configuration...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="gap-2">
                <Settings2 className="w-4 h-4" /> General
              </TabsTrigger>
              <TabsTrigger value="ai-profiles" className="gap-2">
                <Sparkles className="w-4 h-4" /> AI Providers
              </TabsTrigger>
            </TabsList>

            <div className="py-4">
              <TabsContent value="general" className="space-y-6 mt-0">
                {/* Feature Toggles */}
                <div className="space-y-4 border-b border-border pb-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="hints-mode" className="font-medium text-sm">
                        AI Interview Hints
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Show &quot;Lightbulb&quot; button for answer suggestions.
                      </span>
                    </div>
                    <Switch
                      id="hints-mode"
                      checked={settings.hintsEnabled === true}
                      onCheckedChange={(c) => setSettings((s) => ({ ...s, hintsEnabled: c }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="autofinish-mode" className="font-medium text-sm">
                        AI Auto-Finish
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Allow AI to decide when to end the interview.
                      </span>
                    </div>
                    <Switch
                      id="autofinish-mode"
                      checked={settings.autoFinishEnabled === true}
                      onCheckedChange={(c) => setSettings((s) => ({ ...s, autoFinishEnabled: c }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="forcetools-mode" className="font-medium text-sm">
                        Force AI Tools (Code/Draw)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Require AI to always ask for code/draw in specific modes.
                      </span>
                    </div>
                    <Switch
                      id="forcetools-mode"
                      checked={settings.forceToolsEnabled === true}
                      onCheckedChange={(c) => setSettings((s) => ({ ...s, forceToolsEnabled: c }))}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="dynamic-scenarios-mode" className="font-medium text-sm">
                        Dynamic Scenarios
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Allow AI to introduce realistic workplace challenges or requirement changes to test adaptability.
                      </span>
                    </div>
                    <Switch
                      id="dynamic-scenarios-mode"
                      checked={settings.dynamicScenariosEnabled === true}
                      onCheckedChange={(c) =>
                        setSettings((s) => ({ ...s, dynamicScenariosEnabled: c }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="deep-audit-mode" className="font-medium text-sm">
                        Deep Evaluation Audit (2-pass Review)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Use a secondary Reviewer Agent to audit final evaluation: eliminate phantom penalties, ensure score consistency, and respect candidate project authority.
                      </span>
                    </div>
                    <Switch
                      id="deep-audit-mode"
                      checked={settings.deepEvaluationAuditEnabled === true}
                      onCheckedChange={(c) =>
                        setSettings((s) => ({ ...s, deepEvaluationAuditEnabled: c }))
                      }
                    />
                  </div>

                  <CollapsibleSection
                    title={
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Retry Settings
                      </span>
                    }
                    defaultOpen={false}
                    className="border-border"
                    headerClassName="py-2 bg-transparent border-none hover:bg-muted/50"
                    contentClassName="pt-0"
                  >
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                          <Label htmlFor="retry-timeout" className="text-xs">
                            Retry on Timeout
                          </Label>
                        </div>
                        <Switch
                          id="retry-timeout"
                          checked={settings.retryOnTimeout === true}
                          onCheckedChange={(c) => setSettings((s) => ({ ...s, retryOnTimeout: c }))}
                        />
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                          <Label htmlFor="retry-rate" className="text-xs">
                            Retry on Rate Limit (429)
                          </Label>
                        </div>
                        <Switch
                          id="retry-rate"
                          checked={settings.retryOnRateLimit === true}
                          onCheckedChange={(c) =>
                            setSettings((s) => ({ ...s, retryOnRateLimit: c }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="maxRetries" className="text-xs">
                          Max Retries
                        </Label>
                        <Input
                          id="maxRetries"
                          type="number"
                          min={0}
                          max={10}
                          value={settings.maxRetries ?? 3}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              maxRetries: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="retryDelay" className="text-xs">
                          Initial Delay (ms)
                        </Label>
                        <Input
                          id="retryDelay"
                          type="number"
                          min={100}
                          max={30000}
                          step={100}
                          value={settings.retryDelay ?? 1000}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              retryDelay: parseInt(e.target.value) || 1000,
                            }))
                          }
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>
                </div>

                {/* API Configuration Button */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> AI Provider Profiles
                    </h3>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Configure multiple AI providers, API keys, and model fallback sequences.
                    </p>
                    <Button
                      onClick={handleManageProfiles}
                      variant="outline"
                      className="w-full h-9 text-xs"
                    >
                      Manage AI Profiles
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
                >
                  Save Configuration
                </Button>
              </TabsContent>

              <TabsContent value="ai-profiles" className="mt-0">
                <AIProviderProfilesEditor
                  onSave={(saved) => {
                    if (onSettingsChanged) onSettingsChanged(saved);
                    onOpenChange(false);
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
