import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCVStudio } from './useCVStudio';
import { useJobStore } from '../stores/useJobStore';

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    getMainCV: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/resume/cvChatService', () => ({
  streamCVChatMessage: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn().mockReturnValue({ apiKey: 'test-key' }),
}));

vi.mock('@/services/resume/resumeAIService', () => ({
  tailorResumeV2: vi.fn(),
  parseResumeToJSON: vi.fn(),
}));

vi.mock('@/services/ai/rootPrompt', () => ({
  ROOT_PROMPT: 'root prompt',
}));

vi.mock('@/events/apiKeyEvents', () => ({
  openApiKeyModal: vi.fn(),
}));

describe('useCVStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useJobStore.setState({ jobs: [], globalPrompt: 'default' });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useCVStudio());
    expect(result.current.state.isLoading).toBe(true);
  });

  it('should provide UI state setters', () => {
    const { result } = renderHook(() => useCVStudio());

    act(() => {
      result.current.ui.setIsJobPanelOpen(false);
    });

    expect(result.current.ui.isJobPanelOpen).toBe(false);
  });

  it('should add a job via handleAddJob', () => {
    const { result } = renderHook(() => useCVStudio());

    act(() => {
      result.current.actions.handleAddJob();
    });

    expect(result.current.state.jobs).toHaveLength(1);
  });

  it('should remove a job via handleRemoveJob', () => {
    const { result } = renderHook(() => useCVStudio());

    act(() => {
      result.current.actions.handleAddJob();
    });

    const jobId = result.current.state.jobs[0].id;

    act(() => {
      result.current.actions.handleRemoveJob(jobId);
    });

    expect(result.current.state.jobs).toHaveLength(0);
  });

  it('should toggle job selection', () => {
    const { result } = renderHook(() => useCVStudio());

    act(() => {
      result.current.actions.handleAddJob();
    });

    const jobId = result.current.state.jobs[0].id;

    act(() => {
      result.current.actions.handleToggleJobSelection(jobId);
    });

    expect(result.current.state.selectedJobs.has(jobId)).toBe(true);

    act(() => {
      result.current.actions.handleToggleJobSelection(jobId);
    });

    expect(result.current.state.selectedJobs.has(jobId)).toBe(false);
  });

  it('should update template via UI actions', () => {
    const { result } = renderHook(() => useCVStudio());

    act(() => {
      result.current.ui.setTemplate('classic');
    });

    expect(result.current.ui.template).toBe('classic');
  });
});