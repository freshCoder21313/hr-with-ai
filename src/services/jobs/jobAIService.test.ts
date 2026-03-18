import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractInfoFromJD } from './jobAIService';
import { getService, resolveConfig } from '@/services/ai/aiConfigService';

vi.mock('@/services/ai/aiConfigService');

describe('jobAIService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractInfoFromJD', () => {
    it('should extract job info from a job description', async () => {
      const mockGenerateText = vi.fn().mockResolvedValue({
        text: '{ "company": "TestCo", "jobTitle": "Tester" }',
      });
      vi.mocked(getService).mockReturnValue({
        generateText: mockGenerateText,
      } as any);
      vi.mocked(resolveConfig).mockReturnValue({ apiKey: 'test-key', provider: 'google' });

      const jobInfo = await extractInfoFromJD('job description', 'test-api-key');

      expect(getService).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalled();
      expect(jobInfo.company).toBe('TestCo');
      expect(jobInfo.jobTitle).toBe('Tester');
    });
  });
});
