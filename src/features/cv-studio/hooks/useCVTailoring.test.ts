import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCVTailoring } from './useCVTailoring';
import { db } from '@/lib/db';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      update: vi.fn(),
      add: vi.fn().mockResolvedValue(99),
      toArray: vi.fn().mockResolvedValue([]),
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

const toArray = vi.mocked(db.resumes.toArray);
const toastError = vi.mocked(toast.error);

describe('useCVTailoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toArray.mockResolvedValue([]);
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

  it('clears isProcessing and warns the user when the refresh after tailoring fails', async () => {
    toArray.mockRejectedValueOnce(new Error('db offline'));
    const onResumesUpdated = vi.fn();
    const { result } = renderHook(() =>
      useCVTailoring({
        jobs: [{ id: 'job-1', company: 'A', title: 'Dev', description: 'JD', customPrompt: '' }],
        globalPrompt: 'prompt',
        onResumesUpdated,
      })
    );

    act(() => {
      result.current.setSelectedResumeId(1);
    });

    act(() => {
      result.current.handleToggleJobSelection('job-1');
    });

    const resumes = [
      {
        id: 1,
        createdAt: 1,
        fileName: 'cv',
        rawText: '',
        parsedData: { basics: {} },
      },
    ] as unknown as Parameters<typeof result.current.handleStartTailoring>[0];

    await act(async () => {
      await result.current.handleStartTailoring(resumes);
    });

    // A rejected toArray must not leave the panel stuck on "Tailoring...".
    expect(result.current.isProcessing).toBe(false);
    expect(toastError).toHaveBeenCalledWith('Could not refresh the CV list. Please try again.');
  });
});
