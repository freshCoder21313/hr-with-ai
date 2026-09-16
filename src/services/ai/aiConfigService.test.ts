import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveConfig,
  getService,
  getStoredAIConfig,
  AIConfig,
  testAIConnection,
} from './aiConfigService';
import { AIProviderError } from './aiErrors';

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/services/ai/ai.service', () => {
  return {
    AIService: vi.fn().mockImplementation(function (this: any) {
      this.generateText = vi.fn().mockResolvedValue({ text: 'Connection Successful' });
      this.generateStructured = vi.fn();
      this.streamText = vi.fn();
      this.ask = vi.fn();
    }),
  };
});

describe('aiConfigService', () => {
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    vi.clearAllMocks();
  });

  describe('resolveConfig', () => {
    it('should resolve a string config to a Google AIConfig object', () => {
      const config = 'test-api-key';
      const resolved = resolveConfig(config);
      expect(resolved).toEqual({ apiKey: 'test-api-key', provider: 'google' });
    });

    it('should return an AIConfig object as is', () => {
      const config: AIConfig = { apiKey: 'test-api-key', provider: 'openai' };
      const resolved = resolveConfig(config);
      expect(resolved).toEqual(config);
    });
  });

  describe('getService', () => {
    it('should return an AIService instance for Google', () => {
      const service = getService('test-api-key');
      expect(service).toBeDefined();
    });

    it('should return an AIService instance for OpenAI', () => {
      const config: AIConfig = {
        apiKey: 'test-api-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
      };
      const service = getService(config);
      expect(service).toBeDefined();
    });
  });

  describe('getStoredAIConfig', () => {
    it('should retrieve config from localStorage', () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'gemini_api_key') return 'stored-api-key';
          if (key === 'custom_base_url') return 'https://my-custom-url.com/v1';
          if (key === 'custom_model_id') return 'my-model';
          if (key === 'ai_provider') return 'openai';
          return null;
        }
      );

      const config = getStoredAIConfig();
      expect(config).toEqual({
        apiKey: 'stored-api-key',
        baseUrl: 'https://my-custom-url.com/v1',
        modelId: 'my-model',
        provider: 'openai',
        profileId: undefined,
        source: 'explicit',
      });
    });

    it('should return default values if localStorage is empty', () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const config = getStoredAIConfig();
      expect(config).toEqual({
        apiKey: '',
        baseUrl: undefined,
        modelId: undefined,
        provider: 'google',
        profileId: undefined,
        source: 'explicit',
      });
    });
  });

  describe('testAIConnection', () => {
    it('should return true when connection is successful', async () => {
      const { AIService } = await import('@/services/ai/ai.service');
      (AIService as any).mockImplementationOnce(function (this: any) {
        this.generateText = vi.fn().mockResolvedValue({ text: 'Connection Successful' });
        return this;
      });

      const config: AIConfig = { apiKey: 'valid-key', provider: 'google' };
      const result = await testAIConnection(config);
      expect(result).toBe(true);
    });

    it('should throw sanitized error when authentication fails', async () => {
      const { AIService } = await import('@/services/ai/ai.service');
      (AIService as any).mockImplementationOnce(function (this: any) {
        this.generateText = vi
          .fn()
          .mockRejectedValue(new AIProviderError('401 Unauthorized', 'auth', 'google', 401));
        return this;
      });

      const config: AIConfig = { apiKey: 'invalid-key', provider: 'google' };
      await expect(testAIConnection(config)).rejects.toThrow(
        'Authentication failed. Check your API Key.'
      );
    });
  });
});
