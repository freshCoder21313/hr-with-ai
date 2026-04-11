import React, { useState, useEffect } from 'react';
import { AIModelProvider } from '@/types';
import { loadUserSettings, saveUserSettings } from '@/services/core/settingsService';
import { subscribeToApiKeyModal } from '@/events/apiKeyEvents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, X, RefreshCw } from 'lucide-react';

type GeminiModel = {
  name: string;
};

const ApiKeyModal: React.FC = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('custom_base_url') || '');
  const [modelId, setModelId] = useState(() => localStorage.getItem('custom_model_id') || '');
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [provider, setProvider] = useState<AIModelProvider>(
    () => (localStorage.getItem('ai_provider') as AIModelProvider) || 'google'
  );
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

  const handleFetchModels = async () => {
    if (!apiKey) {
      alert('Please enter your API Key first.');
      return;
    }
    setIsFetchingModels(true);
    setGeminiModels([]);
    try {
      // Use custom baseUrl if provided, otherwise default
      const effectiveBaseUrl = (baseUrl || 'https://generativelanguage.googleapis.com').replace(
        /\/$/,
        ''
      );
      const url = `${effectiveBaseUrl}/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      const models = data.models
        .map((m: GeminiModel) => m.name)
        .filter((name: string) => name.includes('gemini'));
      setGeminiModels(models);
    } catch (error) {
      console.error('Failed to fetch Gemini models:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to fetch models. Check your API Key and Base URL. Error: ${errorMessage}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

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
              onChange={(e) => setProvider(e.target.value as AIModelProvider)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="google" className="bg-popover text-popover-foreground">
                Google Gemini (Default)
              </option>
              <option value="openai" className="bg-popover text-popover-foreground">
                Custom (OpenAI Compatible)
              </option>
              <option value="openrouter" className="bg-popover text-popover-foreground">
                OpenRouter
              </option>
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
              placeholder={provider === 'google' ? 'AIzaSy...' : 'sk-...'}
            />
          </div>

          {/* --- Google Provider Specific --- */}
          {provider === 'google' && (
            <div className="space-y-2">
              <Label className="mb-1 block">Model ID (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={'Fetch models or enter a custom ID'}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels || !apiKey}
                  title="Fetch available models"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingModels ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {geminiModels.length > 0 && (
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="mt-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="" disabled={modelId !== ''}>
                    Select a fetched model to populate ID
                  </option>
                  {geminiModels.map((m) => (
                    <option key={m} value={m} className="bg-popover text-popover-foreground">
                      {m.replace('models/', '')}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* --- Custom / OpenAI / OpenRouter --- */}
          {(provider === 'openai' || provider === 'openrouter') && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div>
                <Label className="mb-1 block">
                  Base URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === 'openrouter'
                      ? 'https://openrouter.ai/api/v1'
                      : 'http://localhost:11434/v1'
                  }
                  className="text-sm"
                />
                <p className="mt-1 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                  ⚠️ Your API Key will be sent to this URL. Only use URLs you trust.
                </p>
              </div>
              <div>
                <Label className="mb-1 block">
                  Model ID{' '}
                  {provider === 'openrouter' && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={
                    provider === 'openrouter'
                      ? 'e.g. liquid/lfm-2.5-1.2b-thinking:free'
                      : 'e.g. llama3'
                  }
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* --- Advanced Button for Google --- */}
          {provider === 'google' && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Custom URL)'}
            </button>
          )}

          {/* --- Advanced section for Google --- */}
          {showAdvanced && provider === 'google' && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div>
                <Label className="mb-1 block">Base URL (Optional)</Label>
                <Input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com"
                  className="text-sm"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Leave empty for default endpoint. For proxies, enter the root proxy URL.
                </p>
                <p className="mt-1 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                  ⚠️ Security Warning: Only use URLs you trust. Your API Key will be sent here.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
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
