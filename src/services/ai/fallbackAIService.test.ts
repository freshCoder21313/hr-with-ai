import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FallbackAIService } from './fallbackAIService';
import { AIService } from './ai.service';
import { resolveCandidates } from './aiCandidateResolver';
import { AIProviderError, AIStructuredOutputError } from './aiErrors';

vi.mock('./ai.service');
vi.mock('./aiCandidateResolver');
vi.mock('@/lib/logger');

describe('Fallback AI Service', () => {
  const mockConfig = { source: 'active-profile' } as any;
  const mockCandidates = [
    { provider: 'google', apiKey: 'k1', modelId: 'm1' },
    { provider: 'openai', apiKey: 'k2', modelId: 'm2' },
  ] as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (resolveCandidates as any).mockResolvedValue(mockCandidates);
  });

  it('successfully returns result from first candidate', async () => {
    const mockService = {
      generateText: vi.fn().mockResolvedValue({ text: 'success' }),
    };
    // Use prototype-style mock for constructor
    vi.mocked(AIService).mockImplementation(function() {
        return mockService as any;
    } as any);

    const fallbackService = new FallbackAIService(mockConfig);
    const result = await fallbackService.generateText([{ role: 'user', content: 'hi' }]);

    expect(result.text).toBe('success');
    expect(mockService.generateText).toHaveBeenCalledTimes(1);
  });

  it('falls back to second candidate on eligible error', async () => {
    const error = new AIProviderError('fail', 'network', 'google', undefined, true, true);

    const service1 = { generateText: vi.fn().mockRejectedValue(error) };
    const service2 = { generateText: vi.fn().mockResolvedValue({ text: 'fallback success' }) };

    let callCount = 0;
    vi.mocked(AIService).mockImplementation(function() {
      callCount++;
      return (callCount === 1 ? service1 : service2) as any;
    } as any);

    const fallbackService = new FallbackAIService(mockConfig);
    const result = await fallbackService.generateText([{ role: 'user', content: 'hi' }]);

    expect(result.text).toBe('fallback success');
    expect(service1.generateText).toHaveBeenCalledTimes(1);
    expect(service2.generateText).toHaveBeenCalledTimes(1);
  });

  it('stops immediately on auth error', async () => {
    const authError = new AIProviderError('auth fail', 'auth', 'google', 401, false, false);
    const service1 = { generateText: vi.fn().mockRejectedValue(authError) };

    vi.mocked(AIService).mockImplementation(function() {
        return service1 as any;
    } as any);

    const fallbackService = new FallbackAIService(mockConfig);
    await expect(fallbackService.generateText([])).rejects.toThrow('auth fail');
  });

  it('stops immediately on structured output error', async () => {
    const parseError = new AIStructuredOutputError('parse fail');
    const service1 = { generateStructured: vi.fn().mockRejectedValue(parseError) };

    vi.mocked(AIService).mockImplementation(function() {
        return service1 as any;
    } as any);

    const fallbackService = new FallbackAIService(mockConfig);
    await expect(fallbackService.generateStructured([], {} as any)).rejects.toThrow('parse fail');
  });

  it('throws secret-safe aggregate error when all fail', async () => {
    const error = new AIProviderError('fail', 'network', 'google', undefined, true, true);
    vi.mocked(AIService).mockImplementation(function() {
        return {
            generateText: vi.fn().mockRejectedValue(error),
        } as any;
    } as any);

    const fallbackService = new FallbackAIService(mockConfig);
    await expect(fallbackService.generateText([])).rejects.toThrow(/exhausted all candidates/);
  });

  describe('streamText', () => {
    it('yields from first candidate success', async () => {
      const mockStream = (async function* () { yield 'ok'; })();
      const mockService = { streamText: vi.fn().mockReturnValue(mockStream) };
      vi.mocked(AIService).mockImplementation(function() {
          return mockService as any;
      } as any);

      const fallbackService = new FallbackAIService(mockConfig);
      const generator = fallbackService.streamText([]);
      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }
      expect(results).toEqual(['ok']);
    });

    it('falls back before first yield', async () => {
      const error = new AIProviderError('fail', 'network', 'google', undefined, true, true);
      const service1 = { streamText: vi.fn().mockImplementation(() => { throw error; }) };
      const service2 = { streamText: vi.fn().mockReturnValue((async function* () { yield 'fallback'; })()) };

      let callCount = 0;
      vi.mocked(AIService).mockImplementation(function() {
        callCount++;
        return (callCount === 1 ? service1 : service2) as any;
      } as any);

      const fallbackService = new FallbackAIService(mockConfig);
      const generator = fallbackService.streamText([]);
      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }
      expect(results).toEqual(['fallback']);
    });

    it('does not fallback after first yield', async () => {
      const mockStream = (async function* () { 
        yield 'partial'; 
        throw new Error('Mid-stream fail');
      })();
      const service1 = { streamText: vi.fn().mockReturnValue(mockStream) };
      vi.mocked(AIService).mockImplementation(function() {
          return service1 as any;
      } as any);

      const fallbackService = new FallbackAIService(mockConfig);
      const generator = fallbackService.streamText([]);
      
      await expect(async () => {
        for await (const _ of generator) {
            // consume
        }
      }).rejects.toThrow('Mid-stream fail');
    });

    it('throws aggregate error if all streams fail before yield', async () => {
        const error = new AIProviderError('fail', 'network', 'google', undefined, true, true);
        vi.mocked(AIService).mockImplementation(function() {
            return {
                streamText: vi.fn().mockImplementation(() => { throw error; })
            } as any;
        } as any);
        const fallbackService = new FallbackAIService(mockConfig);
        const generator = fallbackService.streamText([]);
        await expect(async () => {
            for await (const _ of generator) {
                // consume
            }
        }).rejects.toThrow(/exhausted all candidates \(stream\)/);
    });
  });

  describe('ask', () => {
    it('calls generateText with wrapped message', async () => {
        const fallbackService = new FallbackAIService(mockConfig);
        const spy = vi.spyOn(fallbackService, 'generateText').mockResolvedValue({ text: 'ans' });
        const result = await fallbackService.ask('question');
        expect(result.text).toBe('ans');
        expect(spy).toHaveBeenCalledWith([{ role: 'user', content: 'question' }], undefined);
    });
  });
});
