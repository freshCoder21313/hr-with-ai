import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamCVChatMessage } from './cvChatService';
import { getService } from '@/services/ai/aiConfigService';
import { ResumeData } from '@/types/resume';

vi.mock('@/services/ai/aiConfigService', () => ({
  resolveConfig: vi.fn((input) => (typeof input === 'string' ? { apiKey: input, provider: 'google' } : input)),
  getService: vi.fn(),
}));

vi.mock('@/services/resume/cvPrompt', () => ({
  getCVChatSystemPrompt: vi.fn(() => 'system prompt'),
}));

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn().mockResolvedValue({
    maxRetries: 3,
    retryDelay: 1000,
  }),
}));

describe('cvChatService', () => {
  const mockResume: ResumeData = {
    basics: { name: 'Test User', email: 'test@example.com', label: 'Software Engineer' },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call getService with correct config and handle streaming', async () => {
    const mockService = {
      streamText: vi.fn().mockImplementation(async function* () {
        yield 'Hello';
        yield ' world';
      }),
    };
    (getService as any).mockResolvedValue(mockService);

    const configInput = { apiKey: 'key', provider: 'openrouter', modelId: 'model' } as any;
    const history = [{ role: 'user', content: 'hi' }] as any;
    
    const stream = streamCVChatMessage(history, 'new message', mockResume, configInput);
    
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }

    expect(result).toBe('Hello world');
    // Currently this will FAIL because cvChatService re-maps provider to 'google' or 'openai'
    // and calls new AIService instead of getService.
    expect(getService).toHaveBeenCalledWith(configInput);
    expect(mockService.streamText).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'new message' })
      ]),
      expect.objectContaining({ systemInstruction: 'system prompt' })
    );
  });

  it('should pass Anthropic config unchanged to getService', async () => {
    const mockService = {
      streamText: vi.fn().mockImplementation(async function* () {
        yield 'Anthropic response';
      }),
    };
    (getService as any).mockResolvedValue(mockService);

    const configInput = { apiKey: 'key', provider: 'anthropic', modelId: 'claude-3' } as any;
    const history = [] as any;
    
    const stream = streamCVChatMessage(history, 'hi', mockResume, configInput);
    
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Currently this will FAIL because it will be remapped to 'google' (since no baseUrl)
    expect(getService).toHaveBeenCalledWith(configInput);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
