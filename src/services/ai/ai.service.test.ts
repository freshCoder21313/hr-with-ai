import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './ai.service';
import { GoogleGeminiStrategy } from './strategies/google-gemini';
import { AnthropicStrategy } from './strategies/anthropic';

vi.mock('./strategies/google-gemini', () => ({
  GoogleGeminiStrategy: vi.fn().mockImplementation(function () {
    return {
      generateText: vi.fn(),
      streamText: vi.fn(),
      generateStructured: vi.fn(),
    };
  }),
}));

vi.mock('./strategies/anthropic', () => ({
  AnthropicStrategy: vi.fn().mockImplementation(function () {
    return {
      generateText: vi.fn(),
      streamText: vi.fn(),
      generateStructured: vi.fn(),
    };
  }),
}));

vi.mock('./strategies/openai-custom', () => ({
  OpenAICustomStrategy: vi.fn().mockImplementation(function () {
    return {
      generateText: vi.fn(),
      streamText: vi.fn(),
      generateStructured: vi.fn(),
    };
  }),
}));

vi.mock('./strategies/openrouter', () => ({
  OpenRouterStrategy: vi.fn().mockImplementation(function () {
    return {
      generateText: vi.fn(),
      streamText: vi.fn(),
      generateStructured: vi.fn(),
    };
  }),
}));

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass modelId to GoogleGeminiStrategy constructor', () => {
    const config = {
      apiKey: 'key',
      provider: 'google',
      modelId: 'gemini-exp',
    } as any;

    new AIService(config);

    // This will FAIL currently because it only takes (apiKey, baseUrl)
    expect(GoogleGeminiStrategy).toHaveBeenCalledWith('key', undefined, 'gemini-exp');
  });

  it('should pass modelId to AnthropicStrategy constructor', () => {
    const config = {
      apiKey: 'key',
      provider: 'anthropic',
      modelId: 'claude-3-opus',
    } as any;

    new AIService(config);

    // This will FAIL currently
    expect(AnthropicStrategy).toHaveBeenCalledWith('key', undefined, 'claude-3-opus');
  });

  it('should still work without modelId (passing undefined)', () => {
    const config = {
      apiKey: 'key',
      provider: 'google',
    } as any;

    new AIService(config);

    expect(GoogleGeminiStrategy).toHaveBeenCalledWith('key', undefined, undefined);
  });
});
