import React, { useState, useEffect } from 'react';
import { loadUserSettings, saveUserSettings } from '@/services/settingsService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';

const ApiKeyModal: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('custom_base_url') || '');
  const [modelId, setModelId] = useState(() => localStorage.getItem('custom_model_id') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOpen, setIsOpen] = useState(() => !localStorage.getItem('gemini_api_key'));

  useEffect(() => {
    // Load full settings from DB on mount to ensure consistency
    const loadSettings = async () => {
      const settings = await loadUserSettings();
      setApiKey(settings.apiKey || '');
      setBaseUrl(settings.baseUrl || '');
      setModelId(settings.defaultModel || '');
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (apiKey.trim()) {
      try {
        const currentSettings = await loadUserSettings();
        await saveUserSettings({
          ...currentSettings,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          defaultModel: modelId.trim(),
        });

        setIsOpen(false);
        window.location.reload();
      } catch (error) {
        console.error('Failed to save API key:', error);
        alert('Failed to save settings. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-md border border-border text-card-foreground">
        <h2 className="text-xl font-bold text-foreground mb-2">Configure AI Provider</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Enter your API Key. Default is Google Gemini, or configure a custom provider below.
        </p>

        <Alert className="mb-4 bg-primary/10 border-primary/20">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold ml-2">Privacy & Security</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground ml-2 mt-1">
            Your API Key is stored <strong>locally in your browser</strong>. We do not store it on
            our servers. It is strictly used to communicate with Google Gemini AI.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">
              API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... or sk-..."
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Custom URL / Model)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 bg-muted/50 p-3 rounded-lg border border-border">
              <div>
                <Label className="mb-1 block">Base URL (Optional)</Label>
                <Input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty for default Google Gemini.
                </p>
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-1">
                  ⚠️ Security Warning: Only use URLs you trust. Your API Key will be sent here.
                </p>
              </div>
              <div>
                <Label className="mb-1 block">Model ID (Optional)</Label>
                <Input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="google/gemini-2.0-flash-exp"
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={!apiKey.trim()} className="w-full">
            Save API Key
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Get your key at{' '}
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
      </div>
    </div>
  );
};

export default ApiKeyModal;
