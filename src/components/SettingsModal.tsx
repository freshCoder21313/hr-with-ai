import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { db } from '@/lib/db';
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
    apiKey: '',
    baseUrl: '',
    modelId: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on open
  useEffect(() => {
    if (open) {
      const loadSettings = async () => {
        try {
          // Load from DB first
          const storedDB = await db.userSettings.orderBy('id').first();
          
          // Fallback to localStorage for API keys (migration path or simplicity)
          const localApiKey = localStorage.getItem('gemini_api_key') || '';
          const localBaseUrl = localStorage.getItem('custom_base_url') || '';
          const localModelId = localStorage.getItem('custom_model_id') || '';

          if (storedDB) {
            setSettings({
              ...storedDB,
              apiKey: storedDB.apiKey || localApiKey, // Prioritize DB but fallback
              baseUrl: storedDB.baseUrl || localBaseUrl,
              modelId: storedDB.defaultModel || localModelId
            });
          } else {
             // If no DB record, use defaults + localStorage
             setSettings(prev => ({
                 ...prev,
                 apiKey: localApiKey,
                 baseUrl: localBaseUrl,
                 modelId: localModelId
             }));
          }
        } catch (error) {
          console.error("Failed to load settings:", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadSettings();
    }
  }, [open]);

  const handleSave = async () => {
      try {
        // 1. Save critical keys to localStorage (legacy support & syncService compatibility)
        if (settings.apiKey?.trim()) localStorage.setItem('gemini_api_key', settings.apiKey.trim());
        if (settings.baseUrl?.trim()) localStorage.setItem('custom_base_url', settings.baseUrl.trim());
        else localStorage.removeItem('custom_base_url');
        if (settings.modelId?.trim()) localStorage.setItem('custom_model_id', settings.modelId.trim());
        else localStorage.removeItem('custom_model_id');

        // 2. Save to DB
        const dbRecord = {
            voiceEnabled: settings.voiceEnabled,
            hintsEnabled: settings.hintsEnabled,
            apiKey: settings.apiKey,
            defaultModel: settings.modelId,
            // baseUrl: settings.baseUrl // Note: baseUrl not yet in UserSettings type strictly, but we can add or ignore
        };

        if (settings.id) {
            await db.userSettings.update(settings.id, dbRecord);
        } else {
            const id = await db.userSettings.add(dbRecord);
            setSettings(prev => ({ ...prev, id }));
        }

        if (onSettingsChanged) onSettingsChanged(settings);
        onOpenChange(false); // Close modal
      } catch (error) {
          console.error("Failed to save settings:", error);
          alert("Failed to save settings");
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
                            <Label htmlFor="voice-mode" className="font-medium text-sm">Voice Input/Output</Label>
                            <span className="text-[11px] text-slate-500">Enable speech recognition and text-to-speech.</span>
                        </div>
                        <Switch 
                            id="voice-mode" 
                            checked={settings.voiceEnabled !== false}
                            onCheckedChange={(c) => setSettings(s => ({ ...s, voiceEnabled: c }))}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="hints-mode" className="font-medium text-sm">AI Interview Hints</Label>
                            <span className="text-[11px] text-slate-500">Show "Lightbulb" button for answer suggestions.</span>
                        </div>
                        <Switch 
                            id="hints-mode" 
                            checked={settings.hintsEnabled === true}
                            onCheckedChange={(c) => setSettings(s => ({ ...s, hintsEnabled: c }))}
                        />
                    </div>
                </div>

                {/* API Configuration */}
                <div className="space-y-4">
                     <h3 className="text-sm font-semibold text-slate-900">AI Provider</h3>
                     
                     <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-xs">API Key <span className="text-red-500">*</span></Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={settings.apiKey || ''}
                            onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                            placeholder="AIzaSy... or sk-..."
                            className="h-9"
                        />
                        <p className="text-[10px] text-slate-400">
                            Required. Get key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.
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
                                <Label htmlFor="baseUrl" className="text-xs">Base URL (Optional)</Label>
                                <Input
                                    id="baseUrl"
                                    value={settings.baseUrl || ''}
                                    onChange={(e) => setSettings(s => ({ ...s, baseUrl: e.target.value }))}
                                    placeholder="https://openrouter.ai/api/v1"
                                    className="h-8 text-xs bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="modelId" className="text-xs">Model ID (Optional)</Label>
                                <Input
                                    id="modelId"
                                    value={settings.defaultModel || ''} // map defaultModel to UI modelId
                                    onChange={(e) => setSettings(s => ({ ...s, defaultModel: e.target.value, modelId: e.target.value }))}
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
  )
}

export default SettingsModal;
