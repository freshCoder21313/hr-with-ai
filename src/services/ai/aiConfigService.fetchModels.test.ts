import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProviderModels } from './aiConfigService';
import { AIProviderError } from './aiErrors';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        list: vi.fn().mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            yield { name: 'models/sdk-model-1' };
            yield { name: 'models/sdk-model-2' };
          }
        })
      }
    }
  };
});

describe('fetchProviderModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Google', () => {
    it('fetches models from REST API when baseUrl is provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-pro' },
            { name: 'models/gemini-ultra' },
            { name: 'other-prefix/some-model' }
          ]
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const models = await fetchProviderModels({
        provider: 'google',
        apiKey: 'test-key',
        baseUrl: 'https://custom.google.api'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.google.api/v1beta/models?key=test-key'),
        expect.any(Object)
      );
      expect(models).toEqual(['gemini-pro', 'gemini-ultra', 'other-prefix/some-model']);
    });

    it('deduplicates and sorts models', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/b' },
            { name: 'models/a' },
            { name: 'models/b' }
          ]
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const models = await fetchProviderModels({
        provider: 'google',
        apiKey: 'test-key',
        baseUrl: 'https://custom.google.api'
      });

      expect(models).toEqual(['a', 'b']);
    });

    it('fetches models using SDK when no baseUrl is provided', async () => {
      const models = await fetchProviderModels({
        provider: 'google',
        apiKey: 'test-key'
      });

      expect(models).toEqual(['sdk-model-1', 'sdk-model-2']);
    });
  });

  describe('OpenAI / OpenRouter', () => {
    it('fetches from OpenAI compatible endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' }
          ]
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const models = await fetchProviderModels({
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1/'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4']);
    });

    it('uses default OpenRouter URL if not provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: [] })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await fetchProviderModels({
        provider: 'openrouter',
        apiKey: 'test-key'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.any(Object)
      );
    });
  });

  describe('Anthropic', () => {
    it('fetches models with required headers', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: [{ id: 'claude-3' }]
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const models = await fetchProviderModels({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01'
          })
        })
      );
      expect(models).toEqual(['claude-3']);
    });

    it('handles Anthropic pagination', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 'm1' }],
            has_more: true,
            last_id: 'm1'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 'm2' }],
            has_more: false
          })
        });

      const models = await fetchProviderModels({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      expect(models).toEqual(['m1', 'm2']);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect((global.fetch as any).mock.calls[1][0]).toContain('after_id=m1');
    });
  });

  describe('Error Handling', () => {
    it('throws AIProviderError on non-ok status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(fetchProviderModels({
        provider: 'openai',
        apiKey: 'wrong-key',
        baseUrl: 'https://api.openai.com/v1'
      })).rejects.toThrow(AIProviderError);
    });

    it('aborts on timeout', async () => {
      vi.useFakeTimers();
      (global.fetch as any).mockImplementation((url: string, init?: any) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('AbortError');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });

      const promise = fetchProviderModels({
        provider: 'google',
        apiKey: 'key',
        baseUrl: 'https://url'
      });

      vi.advanceTimersByTime(31000);
      
      await expect(promise).rejects.toThrow(AIProviderError);
      vi.useRealTimers();
    });
  });
});
