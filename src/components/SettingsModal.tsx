import React, { useEffect, useState } from 'react';
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
import { loadUserSettings, saveUserSettings } from '@/services/settingsService';
import { UserSettings } from '@/types';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Settings2, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChanged?: (settings: UserSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange, onSettingsChanged }) => {
  const [settings, setSettings] = useState<UserSettings>({
    hintsEnabled: false,
    autoFinishEnabled: false,
    apiKey: '',
    baseUrl: '',
    modelId: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('general');



  // Load settings on open
  useEffect(() => {
    if (open) {
      const loadSettings = async () => {
        try {
          const stored = await loadUserSettings();
          setSettings({
            ...stored,
            modelId: stored.defaultModel || '',
          });
        } catch (error) {
          console.error('Failed to load settings:', error);
        } finally {
          setIsLoading(false);
        }
      };
      setIsLoading(true);
      loadSettings();
    }
  }, [open]);

  const handleSave = async () => {
    try {
      // Prepare settings object for saving
      const settingsToSave: UserSettings = {
        id: settings.id,
        hintsEnabled: settings.hintsEnabled ?? false,
        autoFinishEnabled: settings.autoFinishEnabled ?? false,
        apiKey: settings.apiKey || '',
        baseUrl: settings.baseUrl || '',
        defaultModel: settings.modelId || '',
      };

      // Save using centralized service
      const savedSettings = await saveUserSettings(settingsToSave);

      // Update local state
      setSettings({
        ...savedSettings,
        modelId: savedSettings.defaultModel || '',
      });

      if (onSettingsChanged) onSettingsChanged(savedSettings);
      onOpenChange(false); // Close modal
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure AI provider, voice, and preferences.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading configuration...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="general" className="gap-2">
                <Settings2 className="w-4 h-4" /> General
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
                </div>

                {/* API Configuration */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> AI Provider
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="text-xs">
                      API Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={settings.apiKey || ''}
                      onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                      placeholder="AIzaSy... or sk-..."
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Required. Get key from{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>

                  <CollapsibleSection
                    title={
                      <span className="text-xs text-muted-foreground">
                        Advanced (Custom Model / URL)
                      </span>
                    }
                    defaultOpen={false}
                    className="border-border"
                    headerClassName="py-2 bg-transparent border-none hover:bg-muted/50"
                    contentClassName="pt-0"
                  >
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border">
                      <div className="space-y-1">
                        <Label htmlFor="baseUrl" className="text-xs">
                          Base URL (Optional)
                        </Label>
                        <Input
                          id="baseUrl"
                          value={settings.baseUrl || ''}
                          onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                          placeholder="https://openrouter.ai/api/v1"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="modelId" className="text-xs">
                          Model ID (Optional)
                        </Label>
                        <Input
                          id="modelId"
                          value={settings.defaultModel || ''}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              defaultModel: e.target.value,
                              modelId: e.target.value,
                            }))
                          }
                          placeholder="google/gemini-2.0-flash-exp"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>
                </div>
              </TabsContent>


            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
            >
              Save Configuration
            </Button>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
