import { describe, it, expect, vi, afterEach } from 'vitest';
import { analyzeResume } from './resumeAIService';
import { getService } from '@/services/ai/aiConfigService';
import { ResumeAnalysis } from '@/types';
import { db } from '@/lib/db';

vi.mock('@/services/ai/aiConfigService');
vi.mock('@/lib/db');

describe('resumeAIService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeResume', () => {
    it('should analyze a resume and return the analysis', async () => {
      const mockGenerateStructured = vi.fn().mockResolvedValue({
        matchScore: 90,
        summary: 'Great fit',
        missingKeywords: [],
        improvements: [],
      });
      vi.mocked(getService).mockResolvedValue({
        generateStructured: mockGenerateStructured,
      } as never);

      const analysis = await analyzeResume('resume text', 'job description', 'test-api-key');

      expect(getService).toHaveBeenCalled();
      expect(mockGenerateStructured).toHaveBeenCalled();
      expect(analysis.matchScore).toBe(90);
      expect(analysis.summary).toBe('Great fit');
    });

    it('should use cached analysis if available', async () => {
      const mockGenerateStructured = vi.fn();
      const cachedAnalysis: ResumeAnalysis = {
        matchScore: 85,
        summary: 'Cached summary',
        missingKeywords: [],
        improvements: [],
      };
      vi.mocked(db.resumes.get).mockResolvedValue({
        analysisResult: cachedAnalysis,
        analyzedJobDescription: 'job description',
      } as never);
      vi.mocked(getService).mockResolvedValue({
        generateStructured: mockGenerateStructured,
      } as never);

      const analysis = await analyzeResume('resume text', 'job description', 'test-api-key', 1);

      expect(db.resumes.get).toHaveBeenCalledWith(1);
      expect(mockGenerateStructured).not.toHaveBeenCalled();
      expect(analysis).toEqual(cachedAnalysis);
    });
  });
});
