import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJobRecommendationFlow } from './useJobRecommendationFlow';
import { Resume, JobRecommendation } from '@/types';
import {
  generateJobRecommendations,
  generateTailoredResumeForJob,
} from '@/services/jobs/jobAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';

vi.mock('@/services/jobs/jobAIService', () => ({
  generateJobRecommendations: vi.fn(),
  generateTailoredResumeForJob: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('useJobRecommendationFlow', () => {
  const mockResume: Resume = {
    id: 1,
    fileName: 'resume.pdf',
    rawText: 'Jane Doe developer resume',
    createdAt: Date.now(),
    parsedData: {
      basics: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        summary: 'Experienced Developer',
      },
      skills: [{ name: 'TypeScript' }],
      work: [],
      education: [],
      projects: [],
    },
  };

  const mockJob: JobRecommendation = {
    id: 'job-1',
    title: 'Senior Software Engineer',
    company: 'Acme',
    industry: 'Tech',
    location: 'Remote',
    salaryRange: '$120k - $150k',
    keyRequirements: ['TypeScript', 'Node.js'],
    whyItFits: 'Matches skills',
    matchScore: 90,
    jobDescription: 'Great role at Acme',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredAIConfig).mockReturnValue({
      apiKey: 'test-api-key',
      provider: 'google',
    } as never);
  });

  it('generates jobs and updates progress correctly', async () => {
    vi.mocked(generateJobRecommendations).mockResolvedValue([mockJob]);

    const onSelectJob = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useJobRecommendationFlow({
        isOpen: true,
        existingResumeId: 1,
        availableResumes: [mockResume],
        onSelectJob,
        onClose,
      })
    );

    expect(result.current.selectedResume).toEqual(mockResume);

    await act(async () => {
      await result.current.handleGenerateJobs();
    });

    expect(result.current.jobs).toEqual([mockJob]);
    expect(result.current.progress).toBe(100);
    expect(result.current.isGenerating).toBe(false);
  });

  it('cleans up progress interval on unmount while generation is in progress', async () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    let resolveJobs: (jobs: JobRecommendation[]) => void;
    const pendingPromise = new Promise<JobRecommendation[]>((resolve) => {
      resolveJobs = resolve;
    });
    vi.mocked(generateJobRecommendations).mockReturnValue(pendingPromise);

    const onSelectJob = vi.fn();
    const onClose = vi.fn();

    const { result, unmount } = renderHook(() =>
      useJobRecommendationFlow({
        isOpen: true,
        existingResumeId: 1,
        availableResumes: [mockResume],
        onSelectJob,
        onClose,
      })
    );

    act(() => {
      void result.current.handleGenerateJobs();
    });

    expect(result.current.isGenerating).toBe(true);

    // Unmount while generating
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    // Resolving promise after unmount shouldn't cause errors
    resolveJobs!([mockJob]);
    await new Promise((r) => setTimeout(r, 50));

    clearIntervalSpy.mockRestore();
  });

  it('cleans up timeout on unmount after selecting a job', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    vi.mocked(generateTailoredResumeForJob).mockResolvedValue({
      basics: { name: 'Jane Doe', summary: 'Tailored' },
      skills: [],
      work: [],
      education: [],
      projects: [],
    });

    const onSelectJob = vi.fn();
    const onClose = vi.fn();

    const { result, unmount } = renderHook(() =>
      useJobRecommendationFlow({
        isOpen: true,
        existingResumeId: 1,
        availableResumes: [mockResume],
        onSelectJob,
        onClose,
      })
    );

    await act(async () => {
      await result.current.handleSelectJob(mockJob);
    });

    expect(result.current.step).toBe('completed');

    // Unmount before the 2000ms timeout fires
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(onSelectJob).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });
});
