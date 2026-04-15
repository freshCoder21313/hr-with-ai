import { AIService, AIServiceOptions } from '@/features/ai-provider/ai.service';
import { AIConfig as ProviderConfig } from '@/types';
import { AIModelProvider } from '@/types';
import { loadUserSettings } from '@/services/core/settingsService';

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  provider?: AIModelProvider;
}

export type AIConfigInput = string | AIConfig;

export const resolveConfig = (input: AIConfigInput): AIConfig => {
  if (typeof input === 'string') return { apiKey: input, provider: 'google' };
  return input;
};

const getRetryOptionsFromSettings = async (): Promise<AIServiceOptions['retry'] | undefined> => {
  try {
    const settings = await loadUserSettings();
    if (settings.maxRetries && settings.maxRetries > 0) {
      return {
        maxRetries: settings.maxRetries,
        delay: settings.retryDelay,
        retryOnTimeout: settings.retryOnTimeout,
        retryOnRateLimit: settings.retryOnRateLimit,
      };
    }
  } catch {
    // Ignore errors, return undefined
  }
  return undefined;
};

// Helper to get AIService instance
export const getService = async (input: AIConfigInput): Promise<AIService> => {
  const config = resolveConfig(input);

  let provider = config.provider || (config.baseUrl ? 'openai' : 'google');
  let baseUrl = config.baseUrl;

  if (provider === 'openrouter') {
    provider = 'openai';
    baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
  }

  const providerConfig: ProviderConfig = {
    apiKey: config.apiKey,
    baseUrl: baseUrl,
    modelId: config.modelId,
    provider: provider,
  };

  const retryOptions = await getRetryOptionsFromSettings();
  return new AIService(providerConfig, { retry: retryOptions });
};

export const getServiceWithOptions = (
  input: AIConfigInput,
  options?: AIServiceOptions
): AIService => {
  const config = resolveConfig(input);

  let provider = config.provider || (config.baseUrl ? 'openai' : 'google');
  let baseUrl = config.baseUrl;

  if (provider === 'openrouter') {
    provider = 'openai';
    baseUrl = baseUrl || 'https://openrouter.ai/api/v1';
  }

  const providerConfig: ProviderConfig = {
    apiKey: config.apiKey,
    baseUrl: baseUrl,
    modelId: config.modelId,
    provider: provider,
  };

  return new AIService(providerConfig, options);
};

export const getStoredAIConfig = (): AIConfig => {
  return {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    baseUrl: localStorage.getItem('custom_base_url') || undefined,
    modelId: localStorage.getItem('custom_model_id') || undefined,
    provider: (localStorage.getItem('ai_provider') as AIModelProvider) || 'google',
  };
};
