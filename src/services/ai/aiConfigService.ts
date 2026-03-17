import { AIService } from '@/features/ai-provider/ai.service';
import { AIConfig as ProviderConfig } from '@/types';
import { AIModelProvider } from '@/types';

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

// Helper to get AIService instance
export const getService = (input: AIConfigInput): AIService => {
  const config = resolveConfig(input);

  let provider = config.provider || (config.baseUrl ? 'openai' : 'google');
  let baseUrl = config.baseUrl;

  // Map OpenRouter to OpenAI strategy
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
  return new AIService(providerConfig);
};

export const getStoredAIConfig = (): AIConfig => {
  return {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    baseUrl: localStorage.getItem('custom_base_url') || undefined,
    modelId: localStorage.getItem('custom_model_id') || undefined,
    provider: (localStorage.getItem('ai_provider') as AIModelProvider) || 'google',
  };
};
