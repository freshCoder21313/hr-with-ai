import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractInterviewTurns,
  detectLocalFillerWords,
  computeDeliveryMetrics,
  generateCommunicationReport,
} from './communicationCoachService';
import { Interview, Message, InterviewStatus } from '@/types';
import { db } from '@/lib/db';

vi.mock('@/services/ai/aiConfigService', () => ({
  getService: vi.fn(),
  getStoredAIConfig: vi.fn().mockReturnValue({ apiKey: 'test-key', provider: 'google' }),
}));

describe('communicationCoachService', () => {
  const sampleMessages: Message[] = [
    {
      role: 'model',
      content: 'Chào bạn, bạn có thể giới thiệu về dự án gần nhất?',
      timestamp: 1000,
    },
    {
      role: 'user',
      content:
        'Dạ, ừm, tôi đã làm việc trên hệ thống microservices. Kiểu như tôi dùng Redis để cache.',
      timestamp: 2000,
    },
    { role: 'model', content: 'Bạn xử lý cache invalidation thế nào?', timestamp: 3000 },
    {
      role: 'user',
      content: 'Chắc là tôi dùng TTL và pub/sub event để xóa cache khi data thay đổi.',
      timestamp: 4000,
    },
  ];

  const sampleInterview: Interview = {
    id: 999,
    createdAt: Date.now(),
    company: 'VNG',
    jobTitle: 'Backend Engineer',
    interviewerPersona: 'Strict Tech Lead',
    jobDescription: 'Go, Redis, Distributed Systems',
    resumeText: 'Experienced Backend Dev',
    language: 'vi-VN',
    status: InterviewStatus.COMPLETED,
    messages: sampleMessages,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.interviews.clear();
    await db.interviews.add(sampleInterview);
  });

  describe('extractInterviewTurns', () => {
    it('correctly pairs questions and user answers into dialogue turns', () => {
      const turns = extractInterviewTurns(sampleMessages);
      expect(turns).toHaveLength(2);
      expect(turns[0].questionIndex).toBe(1);
      expect(turns[0].question).toContain('giới thiệu');
      expect(turns[0].answer).toContain('microservices');
      expect(turns[1].questionIndex).toBe(2);
      expect(turns[1].question).toContain('cache invalidation');
      expect(turns[1].answer).toContain('TTL');
    });

    it('returns empty turns when there are no user messages', () => {
      const turns = extractInterviewTurns([
        { role: 'model', content: 'Hello there!', timestamp: 1000 },
      ]);
      expect(turns).toHaveLength(0);
    });
  });

  describe('detectLocalFillerWords & computeDeliveryMetrics', () => {
    it('detects Vietnamese filler words accurately', () => {
      const text = 'Dạ ừm, tôi thấy là kiểu như nó bị chậm, chắc là do network.';
      const fillers = detectLocalFillerWords(text, true);
      const words = fillers.map((f) => f.word);
      expect(words).toContain('ừm');
      expect(words).toContain('kiểu như');
      expect(words).toContain('chắc là');
    });

    it('detects English filler words accurately', () => {
      const text = 'Basically, I like, um, worked on the database migration, you know.';
      const fillers = detectLocalFillerWords(text, false);
      const words = fillers.map((f) => f.word);
      expect(words).toContain('basically');
      expect(words).toContain('um');
      expect(words).toContain('like');
      expect(words).toContain('you know');
    });

    it('computes metrics including total words and average turn length', () => {
      const turns = extractInterviewTurns(sampleMessages);
      const metrics = computeDeliveryMetrics(turns, 'vi-VN');

      expect(metrics.totalWords).toBeGreaterThan(15);
      expect(metrics.averageAnswerWordCount).toBeGreaterThan(5);
      expect(metrics.pacingAssessment).toBeDefined();
      expect(metrics.hedgingPhrasesCount).toBeGreaterThanOrEqual(1); // 'chắc là'
    });
  });

  describe('generateCommunicationReport', () => {
    it('calls AI service, returns structured report, and updates IndexedDB', async () => {
      const { getService } = await import('@/services/ai/aiConfigService');
      const mockGenerateStructured = vi.fn().mockResolvedValue({
        overallScore: {
          fluencyScore: 8,
          vocabularyScore: 7,
          professionalismScore: 8.5,
        },
        summaryTakeaway: 'Good structured thinking with minor hesitation.',
        deliveryMetrics: {
          totalWords: 30,
          fillerWords: [{ word: 'ừm', count: 1, contextSnippets: ['...ừm...'] }],
          hedgingPhrasesCount: 1,
          averageAnswerWordCount: 15,
          pacingAssessment: 'good',
        },
        turnAnalyses: [
          {
            questionIndex: 1,
            question: 'Giới thiệu dự án',
            originalAnswer: 'Tôi đã làm việc trên hệ thống...',
            grammarIssues: [],
            vocabularyUpgrades: [
              {
                casualWord: 'làm việc',
                professionalAlternative: 'thiết kế và vận hành',
                reason: 'Thể hiện vai trò chủ động',
              },
            ],
            languageTransformation: {
              targetLanguage: 'English (US / International)',
              directTranslation: 'I worked on a microservices system...',
              professionalUpgrade:
                'I architected and deployed a distributed microservices infrastructure...',
              frameworkBreakdown: {
                action: 'Architected distributed services using Redis caching',
              },
              keyVocabulary: [
                {
                  term: 'Distributed caching',
                  meaning: 'Bộ nhớ đệm phân tán',
                  sampleUsage: 'Leveraged distributed caching to reduce latency.',
                },
              ],
            },
          },
        ],
      });

      (getService as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        generateStructured: mockGenerateStructured,
      });

      const report = await generateCommunicationReport(sampleInterview, 'en-US', {
        provider: 'google',
        apiKey: 'test',
      });

      expect(report.sourceLanguage).toContain('Vietnamese');
      expect(report.targetLanguage).toContain('English');
      expect(report.overallScore.fluencyScore).toBe(8);
      expect(report.turnAnalyses).toHaveLength(1);
      expect(mockGenerateStructured).toHaveBeenCalledTimes(1);

      // Verify persistence in IndexedDB
      const updated = await db.interviews.get(999);
      expect(updated?.feedback?.communicationCoach).toBeDefined();
      expect(updated?.feedback?.communicationCoach?.overallScore.fluencyScore).toBe(8);
    });

    it('throws error when interview has no user messages', async () => {
      const emptyInterview: Interview = {
        ...sampleInterview,
        messages: [{ role: 'model', content: 'Hello', timestamp: 1 }],
      };

      await expect(
        generateCommunicationReport(emptyInterview, 'en-US', {
          provider: 'google',
          apiKey: 'test',
        })
      ).rejects.toThrow('No candidate responses found');
    });

    it('rejects invalid language input (e.g., numbers or symbols)', async () => {
      await expect(
        generateCommunicationReport(sampleInterview, '123456', {
          provider: 'google',
          apiKey: 'test',
        })
      ).rejects.toThrow(/không hợp lệ/i);
    });

    it('handles AI response with isTargetLanguageRecognized false by falling back to English', async () => {
      const { getService } = await import('@/services/ai/aiConfigService');
      const mockGenerateStructured = vi.fn().mockResolvedValue({
        isTargetLanguageRecognized: false,
        unrecognizedLanguageMessage: 'Ngôn ngữ "GibberishWord" không được nhận diện.',
        overallScore: { fluencyScore: 7, vocabularyScore: 7, professionalismScore: 7 },
        summaryTakeaway: 'Language not recognized, defaulted to English.',
        deliveryMetrics: {
          totalWords: 30,
          fillerWords: [],
          hedgingPhrasesCount: 0,
          averageAnswerWordCount: 15,
          pacingAssessment: 'good',
        },
        turnAnalyses: [],
      });

      (getService as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        generateStructured: mockGenerateStructured,
      });

      const report = await generateCommunicationReport(sampleInterview, 'GibberishWord', {
        provider: 'google',
        apiKey: 'test',
      });

      expect(report.isTargetLanguageRecognized).toBe(false);
      expect(report.targetLanguage).toBe('English (US / International)');
      expect(report.unrecognizedLanguageMessage).toContain('GibberishWord');
      expect(report.requestedLanguage).toBe('GibberishWord');
    });
  });
});
