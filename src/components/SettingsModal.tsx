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
import { loadUserSettings, saveUserSettings } from '@/services/settingsService';
import { UserSettings } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChanged?: (settings: UserSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange, onSettingsChanged }) => {
  const [settings, setSettings] = useState<UserSettings>({
    voiceEnabled: true,
    hintsEnabled: false,
    autoFinishEnabled: false,
    apiKey: '',
    baseUrl: '',
    modelId: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on open
  useEffect(() => {
    if (open) {
      const loadSettings = async () => {
        try {
          const stored = await loadUserSettings();
          setSettings({
            ...stored,
            modelId: stored.defaultModel || '', // Map defaultModel to modelId for UI
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
        voiceEnabled: settings.voiceEnabled ?? true,
        hintsEnabled: settings.hintsEnabled ?? false,
        autoFinishEnabled: settings.autoFinishEnabled ?? false,
        apiKey: settings.apiKey || '',
        baseUrl: settings.baseUrl || '',
        defaultModel: settings.modelId || '', // Map UI modelId back to defaultModel
      };

      // Save using centralized service
      const savedSettings = await saveUserSettings(settingsToSave);
      
      // Update local state with saved settings (including ID if newly created)
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
          <DialogDescription>
            Configure your AI provider and interview environment.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading configuration...</div>
        ) : (
          <div className="grid gap-6 py-4">
            {/* Feature Toggles */}
            <div className="space-y-4 border-b border-slate-100 pb-4">
              <h3 className="text-sm font-semibold text-slate-900">Preferences</h3>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="voice-mode" className="font-medium text-sm">
                    Voice Input/Output
                  </Label>
                  <span className="text-[11px] text-slate-500">
                    Enable speech recognition and text-to-speech.
                  </span>
                </div>
                <Switch
                  id="voice-mode"
                  checked={settings.voiceEnabled !== false}
                  onCheckedChange={(c) => setSettings((s) => ({ ...s, voiceEnabled: c }))}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="hints-mode" className="font-medium text-sm">
                    AI Interview Hints
                  </Label>
                  <span className="text-[11px] text-slate-500">
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
                  <span className="text-[11px] text-slate-500">
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
              <h3 className="text-sm font-semibold text-slate-900">AI Provider</h3>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-xs">
                  API Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                  placeholder="AIzaSy... or sk-..."
                  className="h-9"
                />
                <p className="text-[10px] text-slate-400">
                  Required. Get key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Google AI Studio
                  </a>
                  .
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between text-xs text-slate-500 h-8"
              >
                Advanced (Custom Model / URL)
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>

              {showAdvanced && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="space-y-1">
                    <Label htmlFor="baseUrl" className="text-xs">
                      Base URL (Optional)
                    </Label>
                    <Input
                      id="baseUrl"
                      value={settings.baseUrl || ''}
                      onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                      placeholder="https://openrouter.ai/api/v1"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="modelId" className="text-xs">
                      Model ID (Optional)
                    </Label>
                    <Input
                      id="modelId"
                      value={settings.defaultModel || ''} // map defaultModel to UI modelId
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          defaultModel: e.target.value,
                          modelId: e.target.value,
                        }))
                      }
                      placeholder="google/gemini-2.0-flash-exp"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
