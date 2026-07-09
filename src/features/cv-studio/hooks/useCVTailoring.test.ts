import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCVTailoring } from './useCVTailoring';

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      update: vi.fn(),
      add: vi.fn().mockResolvedValue(99),
    },
  },
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn().mockReturnValue({ apiKey: 'test-key' }),
}));

vi.mock('@/services/resume/resumeAIService', () => ({
  tailorResumeV2: vi.fn().mockResolvedValue({ basics: { name: 'Tailored' } }),
  parseResumeToJSON: vi.fn(),
}));

vi.mock('@/events/apiKeyEvents', () => ({
  openApiKeyModal: vi.fn(),
}));

describe('useCVTailoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles job selection', () => {
    const onResumesUpdated = vi.fn();
    const { result } = renderHook(() =>
      useCVTailoring({
        jobs: [{ id: 'job-1', company: 'A', title: 'Dev', description: 'JD', customPrompt: '' }],
        globalPrompt: 'prompt',
        onResumesUpdated,
      })
    );

    act(() => {
      result.current.handleToggleJobSelection('job-1');
    });

    expect(result.current.selectedJobs.has('job-1')).toBe(true);

    act(() => {
      result.current.handleToggleJobSelection('job-1');
    });

    expect(result.current.selectedJobs.has('job-1')).toBe(false);
  });
});
