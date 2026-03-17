import { describe, it, expect, vi, afterEach } from 'vitest';
import { startInterviewSession, generateInterviewFeedback } from './interviewAIService';
import { getService, resolveConfig } from '../ai/aiConfigService';
import { Interview, InterviewStatus } from '@/types';

vi.mock('../ai/aiConfigService');

describe('interviewAIService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startInterviewSession', () => {
    it('should call the AI service and return a greeting', async () => {
      const mockGenerateText = vi
        .fn()
        .mockResolvedValue({ text: 'Hello, this is a test greeting.' });
      vi.mocked(getService).mockReturnValue({
        generateText: mockGenerateText,
      } as any);

      const interview: Interview = {
        id: 1,
        createdAt: Date.now(),
        jobTitle: 'Test Job',
        company: 'TestCo',
        status: InterviewStatus.IN_PROGRESS,
        messages: [],
        interviewerPersona: 'test',
        jobDescription: 'test',
        resumeText: 'test',
        language: 'en-US',
      };

      const greeting = await startInterviewSession(interview, 'test-api-key');

      expect(getService).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalled();
      expect(greeting).toBe('Hello, this is a test greeting.');
    });

    it('should return a default greeting on failure', async () => {
      const mockGenerateText = vi.fn().mockRejectedValue(new Error('AI Error'));
      vi.mocked(getService).mockReturnValue({
        generateText: mockGenerateText,
      } as any);

      const interview: Interview = {
        id: 1,
        createdAt: Date.now(),
        jobTitle: 'Test Job',
        company: 'TestCo',
        status: InterviewStatus.IN_PROGRESS,
        messages: [],
        interviewerPersona: 'test',
        jobDescription: 'test',
        resumeText: 'test',
        language: 'en-US',
      };

      const greeting = await startInterviewSession(interview, 'test-api-key');

      expect(greeting).toContain('System error');
    });
  });

  describe('generateInterviewFeedback', () => {
    it('should generate feedback for an interview', async () => {
      const mockGenerateText = vi
        .fn()
        .mockResolvedValue({ text: '{ "score": 8, "summary": "Good job" }' });
      vi.mocked(getService).mockReturnValue({
        generateText: mockGenerateText,
      } as any);
      vi.mocked(resolveConfig).mockReturnValue({ apiKey: 'test-key', provider: 'google' });

      const interview: Interview = {
        id: 1,
        createdAt: Date.now(),
        jobTitle: 'Test Job',
        company: 'TestCo',
        status: InterviewStatus.COMPLETED,
        messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
        interviewerPersona: 'test',
        jobDescription: 'test',
        resumeText: 'test',
        language: 'en-US',
        feedback: undefined,
      };

      const feedback = await generateInterviewFeedback(interview, 'test-api-key');
      expect(feedback.score).toBe(8);
      expect(feedback.summary).toBe('Good job');
    });
  });
});
