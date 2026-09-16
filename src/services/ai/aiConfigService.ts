import { AIService, AIServiceOptions } from '@/services/ai/ai.service';
import { AIConfig as ProviderConfig } from '@/types';
import { AIModelProvider } from '@/types';
import { loadUserSettings } from '@/services/core/settingsService';
import { FallbackAIService } from './fallbackAIService';
import { logger } from '@/lib/logger';
import { AIProviderError, classifyProviderError } from './aiErrors';
import { GoogleGenAI } from '@google/genai';

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  provider?: AIModelProvider;
  profileId?: string;
  source?: 'active-profile' | 'explicit';
}

export type AIConfigInput = string | AIConfig;

/**
 * Compatible type for AIService and FallbackAIService
 */
export type TIService = Pick<
  AIService,
  'generateText' | 'generateStructured' | 'streamText' | 'ask'
>;

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
export const getService = async (input: AIConfigInput): Promise<TIService> => {
  const config = resolveConfig(input);

  // If source is active-profile, use FallbackAIService
  if (config.source === 'active-profile') {
    const retryOptions = await getRetryOptionsFromSettings();
    return new FallbackAIService(config as ProviderConfig, { retry: retryOptions });
  }

  const provider = config.provider || (config.baseUrl ? 'openai' : 'google');
  let baseUrl = config.baseUrl;

  if (provider === 'openrouter') {
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
): TIService => {
  const config = resolveConfig(input);

  // Fallback service resolution is async, so getServiceWithOptions (sync)
  // remains explicit-only/single-provider for now to avoid breaking sync callers.
  const provider = config.provider || (config.baseUrl ? 'openai' : 'google');
  let baseUrl = config.baseUrl;

  if (provider === 'openrouter') {
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

/**
 * Tests a connection to an AI provider with the given configuration.
 * Returns true if successful, or throws a sanitized error.
 */
export const testAIConnection = async (config: AIConfig): Promise<boolean> => {
  try {
    const service = getServiceWithOptions(config, {
      retry: { maxRetries: 0 },
    });

    const response = await service.generateText(
      [{ role: 'user', content: 'Say "Connection Successful"' }],
      { temperature: 0.1 }
    );

    return !!response.text;
  } catch (error) {
    // Log only provider/kind/status metadata, not raw message
    if (error instanceof AIProviderError) {
      logger.error('AI Connection Test Failed:', {
        provider: error.provider,
        kind: error.kind,
        status: error.status,
      });

      // Map known AIProviderError kinds to fixed generic messages
      switch (error.kind) {
        case 'auth':
          throw new Error('Authentication failed. Check your API Key.');
        case 'not_found':
          throw new Error('Model not found or URL is incorrect.');
        case 'rate_limit':
          throw new Error('Rate limit exceeded. Please try again later.');
        case 'network':
          throw new Error('Network error. Check your internet connection.');
        case 'timeout':
          throw new Error('Request timed out. The provider may be overloaded.');
        default:
          throw new Error('Connection failed. Check the provider configuration and try again.');
      }
    }

    logger.error('AI Connection Test Failed with unknown error');
    throw new Error('Connection failed. Check the provider configuration and try again.');
  }
};

export const getStoredAIConfig = (): AIConfig => {
  const profileId = localStorage.getItem('ai_active_profile_id');

  return {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    baseUrl: localStorage.getItem('custom_base_url') || undefined,
    modelId: localStorage.getItem('custom_model_id') || undefined,
    provider: (localStorage.getItem('ai_provider') as AIModelProvider) || 'google',
    profileId: profileId || undefined,
    source: profileId ? 'active-profile' : 'explicit',
  };
};

/**
 * Fetches the list of available models from a provider.
 */
export const fetchProviderModels = async (config: AIConfig): Promise<string[]> => {
  const { provider, apiKey, baseUrl } = config;
  if (!apiKey && provider !== 'google') {
    throw new Error('API Key is required to fetch models.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    let models: string[] = [];

    if (provider === 'google') {
      if (baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const url = `${cleanBaseUrl}/v1beta/models?key=${apiKey}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw classifyProviderError(new Error(response.statusText), 'google', response.status);
        }
        const data = await response.json();
        models = (data.models || []).map((m: { name: string }) =>
          typeof m.name === 'string' ? m.name.replace(/^models\//, '') : ''
        );
      } else {
        const genAI = new GoogleGenAI({ apiKey });
        const result = await genAI.models.list();
        // GoogleGenAI models.list() returns an async iterator
        for await (const model of result) {
          if (model.name) {
            models.push(model.name.replace(/^models\//, ''));
          }
        }
      }
    } else if (provider === 'openai' || provider === 'openrouter') {
      const defaultBaseUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : '';
      const effectiveBaseUrl = (baseUrl || defaultBaseUrl).replace(/\/$/, '');

      if (!effectiveBaseUrl && provider === 'openai') {
        throw new Error('Base URL is required for OpenAI-compatible provider');
      }

      const url = `${effectiveBaseUrl}/models`;
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw classifyProviderError(new Error(response.statusText), provider, response.status);
      }

      const data = await response.json();
      models = (data.data || []).map((m: { id: string }) => m.id);
    } else if (provider === 'anthropic') {
      const effectiveBaseUrl = (baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
      const url = `${effectiveBaseUrl}/v1/models`;
      const allModels: string[] = [];
      let pageCount = 0;
      let hasMore = true;
      let afterId: string | undefined = undefined;

      while (hasMore && pageCount < 10) {
        const currentUrl = new URL(url);
        if (afterId) {
          currentUrl.searchParams.set('after_id', afterId);
        }

        const response = await fetch(currentUrl.toString(), {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw classifyProviderError(new Error(response.statusText), 'anthropic', response.status);
        }

        const data = await response.json();
        const pageModels = (data.data || []).map((m: { id: string }) => m.id);
        allModels.push(...pageModels);

        hasMore = !!data.has_more;
        afterId = data.last_id;
        pageCount++;
      }
      models = allModels;
    }

    return Array.from(new Set(models.filter(Boolean))).sort();
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw classifyProviderError(new Error('Request timed out'), provider || 'google', 408);
    }
    throw classifyProviderError(error, provider || 'google');
  } finally {
    clearTimeout(timeoutId);
  }
};
