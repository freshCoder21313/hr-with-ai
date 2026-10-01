import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  startInterviewSession,
  generateInterviewFeedback,
  streamInterviewMessage,
  generateInterviewHints,
} from './interviewAIService';
import { getService, resolveConfig } from '@/services/ai/aiConfigService';
import { Interview, InterviewStatus, Message } from '@/types';
import { AIService } from '@/services/ai/ai.service';

vi.mock('@/services/ai/aiConfigService');
vi.mock('@/lib/logger');

describe('interviewAIService', () => {
  const mockInterview: Interview = {
    id: 1,
    createdAt: Date.now(),
    jobTitle: 'Frontend Engineer',
    company: 'TechCo',
    status: InterviewStatus.IN_PROGRESS,
    messages: [],
    interviewerPersona: 'Friendly',
    jobDescription: 'React and TS',
    resumeText: 'Experience in React',
    language: 'en-US',
  };

  const mockAIServiceInstance = {
    generateText: vi.fn(),
    generateStructured: vi.fn(),
    streamText: vi.fn(),
  } as unknown as AIService;

  beforeEach(() => {
    vi.mocked(getService).mockResolvedValue(mockAIServiceInstance);
    vi.mocked(resolveConfig).mockReturnValue({ apiKey: 'test-key', provider: 'google' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startInterviewSession', () => {
    it('should call the AI service and return a greeting', async () => {
      vi.mocked(mockAIServiceInstance.generateText).mockResolvedValue({ text: 'Hello!' });

      const greeting = await startInterviewSession(mockInterview, 'test-key');

      expect(greeting).toBe('Hello!');
      expect(mockAIServiceInstance.generateText).toHaveBeenCalled();
    });

    it('should throw on failure instead of returning an error string as a greeting', async () => {
      vi.mocked(mockAIServiceInstance.generateText).mockRejectedValue(new Error('AI Error'));

      await expect(startInterviewSession(mockInterview, 'test-key')).rejects.toThrow('AI Error');
    });
  });

  describe('streamInterviewMessage', () => {
    it('should handle Gemini stream (no baseUrl)', async () => {
      vi.mocked(resolveConfig).mockReturnValue({ apiKey: 'test-key', provider: 'google' });
      const mockStream = (async function* () {
        yield 'Hello';
        yield ' world';
      })();
      vi.mocked(mockAIServiceInstance.streamText).mockReturnValue(mockStream as any);

      const history: Message[] = [{ role: 'user', content: 'Hi', timestamp: Date.now() }];
      const generator = streamInterviewMessage(history, 'How are you?', mockInterview, 'test-key');

      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toEqual(['Hello', ' world']);
      expect(mockAIServiceInstance.streamText).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('How are you?'),
          }),
        ])
      );
    });

    it('should handle OpenAI/Custom stream (with baseUrl)', async () => {
      vi.mocked(resolveConfig).mockReturnValue({
        apiKey: 'test-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
      });
      const mockStream = (async function* () {
        yield 'Open';
        yield 'AI';
      })();
      vi.mocked(mockAIServiceInstance.streamText).mockReturnValue(mockStream as any);

      const history: Message[] = [{ role: 'user', content: 'Hi', timestamp: Date.now() }];
      const generator = streamInterviewMessage(history, 'How are you?', mockInterview, 'test-key');

      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toEqual(['Open', 'AI']);
      expect(mockAIServiceInstance.streamText).toHaveBeenCalledWith(
        [expect.objectContaining({ role: 'user', content: 'Hi\n\nHow are you?' })],
        expect.objectContaining({ systemInstruction: expect.any(String) })
      );
    });

    it('should handle currentCode and systemInjection', async () => {
      vi.mocked(resolveConfig).mockReturnValue({
        apiKey: 'test-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
      });
      const mockStream = (async function* () {
        yield 'Chunk';
      })();
      vi.mocked(mockAIServiceInstance.streamText).mockReturnValue(mockStream as any);

      const generator = streamInterviewMessage(
        [],
        'Hello',
        mockInterview,
        'test-key',
        'const x = 1;',
        undefined,
        true,
        true,
        'HIDDEN SCENARIO'
      );

      // Consume generator to trigger call
      await generator.next();

      const callArgs = vi.mocked(mockAIServiceInstance.streamText).mock.calls[0][1];
      expect(callArgs?.systemInstruction).toContain('const x = 1;');
      expect(callArgs?.systemInstruction).toContain('HIDDEN SCENARIO');
    });

    it('should throw error on failure', async () => {
      vi.mocked(mockAIServiceInstance.streamText).mockImplementation(() => {
        throw new Error('Stream Error');
      });

      const generator = streamInterviewMessage([], 'Hello', mockInterview, 'test-key');

      await expect(generator.next()).rejects.toThrow('Stream Error');
    });
  });

  describe('generateInterviewFeedback', () => {
    it('should generate structured feedback', async () => {
      const mockFeedback = { score: 90, summary: 'Excellent' };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockFeedback);

      const interviewWithCode = { ...mockInterview, code: 'console.log("test")' };
      const feedback = await generateInterviewFeedback(interviewWithCode, 'test-key');

      expect(feedback).toEqual(mockFeedback);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
    });
  });

  describe('generateInterviewHints', () => {
    it('should generate structured hints', async () => {
      const mockHints = { level1: 'h1', level2: 'h2', level3: 'h3' };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockHints);

      const hints = await generateInterviewHints('What is React?', 'Context...', 'test-key');

      expect(hints).toEqual(mockHints);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
    });
  });
  describe('history normalization', () => {
    const errored = (content: string): Message => ({
      role: 'model',
      content,
      timestamp: Date.now(),
      isError: true,
    });

    it('drops errored turns and merges adjacent same-role turns in the OpenAI payload', async () => {
      vi.mocked(resolveConfig).mockReturnValue({
        apiKey: 'test-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
      });
      vi.mocked(mockAIServiceInstance.streamText).mockReturnValue(
        (async function* () {
          yield 'ok';
        })() as any
      );

      const history: Message[] = [
        { role: 'user', content: 'first question', timestamp: 1 },
        errored('The AI provider stopped responding.'),
        { role: 'user', content: 'second question', timestamp: 2 },
      ];

      for await (const _ of streamInterviewMessage(history, 'answer', mockInterview, 'test-key')) {
        void _;
      }

      const payload = vi.mocked(mockAIServiceInstance.streamText).mock.calls[0][0];
      expect(payload).toEqual([
        { role: 'user', content: 'first question\n\nsecond question\n\nanswer' },
      ]);
      expect(JSON.stringify(payload)).not.toContain('stopped responding');
    });

    it('omits errored turns from the Gemini prompt', async () => {
      vi.mocked(resolveConfig).mockReturnValue({ apiKey: 'test-key', provider: 'google' });
      vi.mocked(mockAIServiceInstance.streamText).mockReturnValue(
        (async function* () {
          yield 'ok';
        })() as any
      );

      const history: Message[] = [
        { role: 'user', content: 'first question', timestamp: 1 },
        errored('The AI provider stopped responding.'),
      ];

      for await (const _ of streamInterviewMessage(history, 'answer', mockInterview, 'test-key')) {
        void _;
      }

      const payload = vi.mocked(mockAIServiceInstance.streamText).mock.calls[0][0];
      expect(payload[0].content).toContain('first question');
      expect(payload[0].content).not.toContain('stopped responding');
    });

    it('omits errored turns from the feedback prompt', async () => {
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue({
        score: 90,
        summary: 'ok',
      });

      const interview: Interview = {
        ...mockInterview,
        messages: [
          { role: 'user', content: 'a question', timestamp: 1 },
          errored('The AI provider stopped responding.'),
        ],
      };

      await generateInterviewFeedback(interview, 'test-key');

      const prompt = vi.mocked(mockAIServiceInstance.generateStructured).mock.calls[0][0][0]
        .content;
      expect(prompt).toContain('a question');
      expect(prompt).not.toContain('stopped responding');
    });
  });
});
