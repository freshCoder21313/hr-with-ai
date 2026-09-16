import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FallbackAIService } from './fallbackAIService';
import { AIService } from './ai.service';
import { resolveCandidates } from './aiCandidateResolver';
import { AIProviderError, AIStructuredOutputError } from './aiErrors';

vi.mock('./ai.service', () => {
  return {
    AIService: vi.fn(),
  };
});
vi.mock('./aiCandidateResolver');

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
    (AIService as any).mockImplementation(function () {
      return mockService;
    });

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
    (AIService as any).mockImplementation(function () {
      callCount++;
      return callCount === 1 ? service1 : service2;
    });

    const fallbackService = new FallbackAIService(mockConfig);
    const result = await fallbackService.generateText([{ role: 'user', content: 'hi' }]);

    expect(result.text).toBe('fallback success');
    expect(service1.generateText).toHaveBeenCalledTimes(1);
    expect(service2.generateText).toHaveBeenCalledTimes(1);
  });

  it('stops immediately on auth error', async () => {
    const authError = new AIProviderError('auth fail', 'auth', 'google', 401, false, false);
    const service1 = { generateText: vi.fn().mockRejectedValue(authError) };

    (AIService as any).mockImplementation(function () {
      return service1;
    });

    const fallbackService = new FallbackAIService(mockConfig);
    await expect(fallbackService.generateText([])).rejects.toThrow('auth fail');
  });

  it('stops immediately on structured output error', async () => {
    const parseError = new AIStructuredOutputError('parse fail');
    const service1 = { generateStructured: vi.fn().mockRejectedValue(parseError) };

    (AIService as any).mockImplementation(function () {
      return service1;
    });

    const fallbackService = new FallbackAIService(mockConfig);
    await expect(fallbackService.generateStructured([], {} as any)).rejects.toThrow('parse fail');
  });

  it('throws secret-safe aggregate error when all fail', async () => {
    const error = new AIProviderError('fail', 'network', 'google', undefined, true, true);
    (AIService as any).mockImplementation(function () {
      return {
        generateText: vi.fn().mockRejectedValue(error),
      };
    });

    const fallbackService = new FallbackAIService(mockConfig);
    await expect(fallbackService.generateText([])).rejects.toThrow(/exhausted all candidates/);
  });
});
