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

    it('should inject ADAPTIVE WORKPLACE CHALLENGE PROTOCOL when dynamicScenariosEnabled is true', async () => {
      vi.mocked(resolveConfig).mockReturnValue({
        apiKey: 'test-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
      });
      const mockStream = (async function* () {
        yield 'Chunk';
      })();
      vi.mocked(mockAIServiceInstance.streamText).mockReturnValue(mockStream as any);

      const dynamicInterview: Interview = {
        ...mockInterview,
        dynamicScenariosEnabled: true,
      };

      const generator = streamInterviewMessage(
        [],
        'Hello',
        dynamicInterview,
        'test-key'
      );

      await generator.next();

      const callArgs = vi.mocked(mockAIServiceInstance.streamText).mock.calls[0][1];
      expect(callArgs?.systemInstruction).toContain('ADAPTIVE WORKPLACE CHALLENGE PROTOCOL');
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
    it('should generate structured feedback with submitted code', async () => {
      const mockFeedback = { score: 90, summary: 'Excellent' };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockFeedback);

      const interviewWithCode = { ...mockInterview, code: 'console.log("test")' };
      const feedback = await generateInterviewFeedback(interviewWithCode, 'test-key');

      expect(feedback).toEqual(mockFeedback);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
      const prompt = vi.mocked(mockAIServiceInstance.generateStructured).mock.calls[0][0][0].content;
      expect(prompt).toContain('CODE SUBMITTED BY CANDIDATE IN EDITOR');
      expect(prompt).toContain('console.log("test")');
    });

    it('should ignore default code placeholder and instruct evaluator not to penalize', async () => {
      const mockFeedback = { score: 85, summary: 'Good' };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockFeedback);

      const interviewWithPlaceholder = {
        ...mockInterview,
        code: '// Write your solution here...',
      };
      await generateInterviewFeedback(interviewWithPlaceholder, 'test-key');

      const prompt = vi.mocked(mockAIServiceInstance.generateStructured).mock.calls[0][0][0].content;
      expect(prompt).toContain('CODE SUBMISSION: None');
      expect(prompt).toContain('Do NOT evaluate, mention, or penalize for missing code');
      expect(prompt).not.toContain('CODE SUBMITTED BY CANDIDATE IN EDITOR');
    });

    it('should perform 2-pass review when deepEvaluationAuditEnabled is true', async () => {
      const draftFeedback = { score: 6.0, summary: 'Draft feedback' };
      const auditedFeedback = { score: 8.0, summary: 'Audited and calibrated feedback' };

      vi.mocked(mockAIServiceInstance.generateStructured)
        .mockResolvedValueOnce(draftFeedback)
        .mockResolvedValueOnce(auditedFeedback);

      const interviewWithAudit = {
        ...mockInterview,
        deepEvaluationAuditEnabled: true,
      };

      const result = await generateInterviewFeedback(interviewWithAudit, 'test-key');

      expect(result).toEqual(auditedFeedback);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalledTimes(2);

      const auditPrompt = vi.mocked(mockAIServiceInstance.generateStructured).mock.calls[1][0][0].content;
      expect(auditPrompt).toContain('Executive Interview Evaluation Auditor');
      expect(auditPrompt).toContain('"Draft feedback"');
    });

    it('should fall back gracefully to draft feedback if audit step fails', async () => {
      const draftFeedback = { score: 7.0, summary: 'Draft feedback' };

      vi.mocked(mockAIServiceInstance.generateStructured)
        .mockResolvedValueOnce(draftFeedback)
        .mockRejectedValueOnce(new Error('Audit provider timeout'));

      const interviewWithAudit = {
        ...mockInterview,
        deepEvaluationAuditEnabled: true,
      };

      const result = await generateInterviewFeedback(interviewWithAudit, 'test-key');

      expect(result).toEqual(draftFeedback);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalledTimes(2);
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
