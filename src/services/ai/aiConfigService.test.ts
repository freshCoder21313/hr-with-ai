import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { resolveConfig, getService, getStoredAIConfig, AIConfig } from './aiConfigService';

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
      (window.localStorage.getItem as Mock).mockImplementation((key: string) => {
        if (key === 'gemini_api_key') return 'stored-api-key';
        if (key === 'custom_base_url') return 'https://my-custom-url.com/v1';
        if (key === 'custom_model_id') return 'my-model';
        if (key === 'ai_provider') return 'openai';
        return null;
      });

      const config = getStoredAIConfig();
      expect(config).toEqual({
        apiKey: 'stored-api-key',
        baseUrl: 'https://my-custom-url.com/v1',
        modelId: 'my-model',
        provider: 'openai',
      });
    });

    it('should return default values if localStorage is empty', () => {
      (window.localStorage.getItem as Mock).mockReturnValue(null);
      const config = getStoredAIConfig();
      expect(config).toEqual({
        apiKey: '',
        baseUrl: undefined,
        modelId: undefined,
        provider: 'google',
      });
    });
  });
});
