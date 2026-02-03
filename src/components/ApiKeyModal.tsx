import React, { useState, useEffect } from 'react';
import { loadUserSettings, saveUserSettings } from '@/services/settingsService';
import { subscribeToApiKeyModal } from '@/events/apiKeyEvents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, X } from 'lucide-react';

const ApiKeyModal: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('custom_base_url') || '');
  const [modelId, setModelId] = useState(() => localStorage.getItem('custom_model_id') || '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [provider, setProvider] = useState<any>(() => localStorage.getItem('ai_provider') || 'google');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOpen, setIsOpen] = useState(() => !localStorage.getItem('gemini_api_key'));

  useEffect(() => {
    // Subscribe to global open event
    const unsubscribe = subscribeToApiKeyModal(() => setIsOpen(true));

    // Load full settings from DB on mount to ensure consistency
    const loadSettings = async () => {
      const settings = await loadUserSettings();
      setApiKey(settings.apiKey || '');
      setBaseUrl(settings.baseUrl || '');
      setModelId(settings.defaultModel || '');
      setProvider(settings.provider || 'google');
    };
    loadSettings();

    return () => unsubscribe();
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
          provider: provider,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-md border border-border text-card-foreground relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button allowing Late Entry */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
          title="Close / Skip for now"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-2 pr-8">Configure AI Provider</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Select your AI provider and enter the API Key.
        </p>

        <Alert className="mb-4 bg-primary/10 border-primary/20">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold ml-2">Privacy & Security</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground ml-2 mt-1">
            Your API Key is stored <strong>locally in your browser</strong>. We do not store it on
            our servers. It is strictly used to communicate with the AI Provider.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <Label className="mb-1 block">AI Service Provider</Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="google" className="bg-popover text-popover-foreground">Google Gemini (Default)</option>
              <option value="openai" className="bg-popover text-popover-foreground">OpenAI / Compatible</option>
              <option value="openrouter" className="bg-popover text-popover-foreground">OpenRouter</option>
              {/* <option value="anthropic">Anthropic Claude</option> */}
            </select>
          </div>

          <div>
            <Label className="mb-1 block">
              API Key <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'google' ? "AIzaSy..." : "sk-..."}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Custom URL / Model)'}
          </button>

          {/* Force show advanced for OpenRouter since Model ID is required */}
          {(showAdvanced || provider === 'openrouter') && (
            <div className="space-y-3 bg-muted/50 p-3 rounded-lg border border-border">
              <div>
                <Label className="mb-1 block">Base URL (Optional)</Label>
                <Input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === 'google'
                      ? "https://generativelanguage.googleapis.com"
                      : provider === 'openrouter'
                      ? "https://openrouter.ai/api/v1"
                      : "https://api.openai.com/v1"
                  }
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty for default endpoint.
                </p>
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-1">
                  ⚠️ Security Warning: Only use URLs you trust. Your API Key will be sent here.
                </p>
              </div>
              <div>
                <Label className="mb-1 block">
                  Model ID {provider === 'openrouter' ? <span className="text-destructive">*</span> : '(Optional)'}
                </Label>
                <Input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={
                    provider === 'google'
                      ? "gemini-2.6-flash-exp"
                      : provider === 'openrouter'
                      ? "e.g. liquid/lfm-2.5-1.2b-thinking:free"
                      : "gpt-4o"
                  }
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!apiKey && (
                 <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                    Skip
                </Button>
            )}
            <Button 
                onClick={handleSave} 
                disabled={!apiKey.trim() || (provider === 'openrouter' && !modelId.trim())} 
                className="w-full"
            >
                Save Configuration
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            Get your key at{' '}
            {provider === 'google' ? (
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            ) : provider === 'openrouter' ? (
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                OpenRouter
              </a>
            ) : (
               <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                OpenAI Platform
              </a>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
