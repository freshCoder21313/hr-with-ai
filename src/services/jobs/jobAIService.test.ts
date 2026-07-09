import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractInfoFromJD } from './jobAIService';
import { getService } from '@/services/ai/aiConfigService';

vi.mock('@/services/ai/aiConfigService');

describe('jobAIService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractInfoFromJD', () => {
    it('should extract job info from a job description', async () => {
      const mockGenerateStructured = vi.fn().mockResolvedValue({
        company: 'TestCo',
        jobTitle: 'Tester',
        interviewerPersona: 'Hiring Manager',
      });
      vi.mocked(getService).mockResolvedValue({
        generateStructured: mockGenerateStructured,
      } as never);

      const jobInfo = await extractInfoFromJD('job description', 'test-api-key');

      expect(getService).toHaveBeenCalled();
      expect(mockGenerateStructured).toHaveBeenCalled();
      expect(jobInfo.company).toBe('TestCo');
      expect(jobInfo.jobTitle).toBe('Tester');
    });
  });
});
