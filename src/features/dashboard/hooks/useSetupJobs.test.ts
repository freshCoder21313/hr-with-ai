import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSetupJobs } from './useSetupJobs';
import * as db from '@/lib/db';
import * as notificationService from '@/services/core/notificationService';
import type { SetupFormData, SavedJob } from '@/types';
import { toast } from 'sonner';

vi.mock('@/lib/db', () => ({
  db: {
    jobs: {
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: {
    confirm: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const formData: SetupFormData = {
  company: 'Acme',
  jobTitle: 'Engineer',
  jobDescription: 'jd',
  interviewerPersona: 'friendly',
  companyStatus: '',
  interviewContext: '',
  language: 'en-US',
  type: 'standard',
  mode: 'text',
  difficulty: 'medium',
  isPanel: false,
  resumeText: '',
} as SetupFormData;

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSetupJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.notificationService.confirm).mockResolvedValue(true);
  });

  it('waits for the reload before reporting a successful create', async () => {
    const reload = deferred();
    vi.mocked(db.db.jobs.add).mockResolvedValue(7 as never);
    const loadData = vi.fn(() => reload.promise);

    const { result } = renderHook(() =>
      useSetupJobs(formData, vi.fn(), loadData, [] as SavedJob[])
    );

    await act(async () => {
      result.current.handleSaveJob();
    });

    expect(vi.mocked(db.db.jobs.add)).toHaveBeenCalledTimes(1);
    expect(loadData).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => {
      reload.resolve();
    });

    expect(toast.success).toHaveBeenCalledWith('Job saved successfully!');
    expect(result.current.selectedJobId).toBe('7');
  });

  it('reports an error, not a success, when the reload fails', async () => {
    vi.mocked(db.db.jobs.add).mockResolvedValue(7 as never);
    const loadData = vi.fn().mockRejectedValue(new Error('reload failed'));

    const { result } = renderHook(() =>
      useSetupJobs(formData, vi.fn(), loadData, [] as SavedJob[])
    );

    await act(async () => {
      result.current.handleSaveJob();
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to save job');
  });

  it('awaits the reload on the update path', async () => {
    const reload = deferred();
    vi.mocked(db.db.jobs.update).mockResolvedValue(1 as never);
    const loadData = vi.fn(() => reload.promise);

    const { result } = renderHook(() =>
      useSetupJobs(formData, vi.fn(), loadData, [] as SavedJob[])
    );
    act(() => {
      result.current.setSelectedJobId('3');
    });

    await act(async () => {
      result.current.handleSaveJob();
    });

    expect(vi.mocked(db.db.jobs.update)).toHaveBeenCalledWith(3, expect.any(Object));
    expect(loadData).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => {
      reload.resolve();
    });

    expect(toast.success).toHaveBeenCalledWith('Job updated successfully!');
  });

  it('does not delete when the confirmation is declined', async () => {
    vi.mocked(notificationService.notificationService.confirm).mockResolvedValue(false);
    const loadData = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSetupJobs(formData, vi.fn(), loadData, [] as SavedJob[])
    );

    await act(async () => {
      await result.current.handleDeleteJob(
        { preventDefault: vi.fn(), stopPropagation: vi.fn() } as never,
        4
      );
    });

    expect(db.db.jobs.delete).not.toHaveBeenCalled();
    expect(loadData).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('deletes, resets the selection and awaits the reload', async () => {
    const reload = deferred();
    vi.mocked(db.db.jobs.delete).mockResolvedValue(undefined);
    const loadData = vi.fn(() => reload.promise);

    const { result } = renderHook(() =>
      useSetupJobs(formData, vi.fn(), loadData, [] as SavedJob[])
    );
    act(() => {
      result.current.setSelectedJobId('4');
    });

    await act(async () => {
      void result.current.handleDeleteJob(
        { preventDefault: vi.fn(), stopPropagation: vi.fn() } as never,
        4
      );
    });

    expect(db.db.jobs.delete).toHaveBeenCalledWith(4);
    expect(result.current.selectedJobId).toBe('new');
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => {
      reload.resolve();
    });

    expect(toast.success).toHaveBeenCalledWith('Job deleted successfully');
  });
});
