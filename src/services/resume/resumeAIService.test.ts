import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  analyzeResume,
  parseResumeToJSON,
  analyzeResumeSection,
  tailorResumeToJob,
  tailorResumeV2,
  translateResume,
} from './resumeAIService';
import { getService } from '@/services/ai/aiConfigService';
import { ResumeAnalysis } from '@/types';
import { ResumeData } from '@/types/resume';
import { db } from '@/lib/db';
import { AIService } from '@/services/ai/ai.service';

vi.mock('@/services/ai/aiConfigService');
vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

describe('resumeAIService', () => {
  const mockAIServiceInstance = {
    generateStructured: vi.fn(),
  } as unknown as AIService;

  beforeEach(() => {
    vi.mocked(getService).mockResolvedValue(mockAIServiceInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeResume', () => {
    const mockAnalysis: ResumeAnalysis = {
      matchScore: 90,
      summary: 'Great fit',
      missingKeywords: ['React'],
      improvements: ['Add projects'],
    };

    it('should analyze a resume and return the analysis', async () => {
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockAnalysis);

      const analysis = await analyzeResume('resume text', 'job description', 'test-key');

      expect(getService).toHaveBeenCalled();
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
      expect(analysis).toEqual(mockAnalysis);
    });

    it('should use cached analysis if available', async () => {
      vi.mocked(db.resumes.get).mockResolvedValue({
        analysisResult: mockAnalysis,
        analyzedJobDescription: 'job description',
      } as any);

      const analysis = await analyzeResume('resume text', 'job description', 'test-key', 1);

      expect(db.resumes.get).toHaveBeenCalledWith(1);
      expect(mockAIServiceInstance.generateStructured).not.toHaveBeenCalled();
      expect(analysis).toEqual(mockAnalysis);
    });

    it('should update cache if resumeId is provided', async () => {
      vi.mocked(db.resumes.get).mockResolvedValue(null as any);
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockAnalysis);

      await analyzeResume('resume text', 'job description', 'test-key', 123);

      expect(db.resumes.update).toHaveBeenCalledWith(123, {
        analysisResult: mockAnalysis,
        analyzedJobDescription: 'job description',
      });
    });

    it('should throw error on failure', async () => {
      vi.mocked(mockAIServiceInstance.generateStructured).mockRejectedValue(new Error('AI Fail'));
      await expect(analyzeResume('r', 'j', 'k')).rejects.toThrow('AI Fail');
    });
  });

  describe('parseResumeToJSON', () => {
    it('should parse raw text to JSON', async () => {
      const mockData: Partial<ResumeData> = { basics: { name: 'John' } };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockData);

      const result = await parseResumeToJSON('raw text', 'test-key');

      expect(result).toEqual(mockData);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
    });
  });

  describe('analyzeResumeSection', () => {
    it('should analyze a specific section', async () => {
      const mockSectionResult = { critique: 'Good', suggestions: ['Add detail'], rewrittenExample: 'Ex' };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockSectionResult);

      const result = await analyzeResumeSection('Work', { company: 'X' }, 'test-key');

      expect(result).toEqual(mockSectionResult);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
    });
  });

  describe('tailorResumeToJob', () => {
    it('should tailor resume to job description', async () => {
      const mockTailored: Partial<ResumeData> = { basics: { name: 'John (Tailored)' } };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockTailored);

      const result = await tailorResumeToJob({ basics: { name: 'John' } } as any, 'JD', 'test-key');

      expect(result).toEqual(mockTailored);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalled();
    });
  });

  describe('tailorResumeV2', () => {
    it('should use provided prompt for tailoring', async () => {
      const mockTailored: Partial<ResumeData> = { basics: { name: 'V2' } };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockTailored);

      const result = await tailorResumeV2('test-key', 'Custom Prompt');

      expect(result).toEqual(mockTailored);
      expect(mockAIServiceInstance.generateStructured).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ content: 'Custom Prompt' })]),
        expect.any(Object)
      );
    });
  });

  describe('translateResume', () => {
    it('should translate resume data', async () => {
      const mockTranslated: Partial<ResumeData> = { basics: { name: 'Dịch' } };
      vi.mocked(mockAIServiceInstance.generateStructured).mockResolvedValue(mockTranslated);

      const source: ResumeData = { basics: { name: 'Translate' } } as any;
      const result = await translateResume(source, 'vi', 'test-key');

      expect(result.basics.name).toBe('Dịch');
      expect(result.language).toBe('vi');
    });
  });
});
