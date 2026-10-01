import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCVResumes } from './useCVResumes';
import { db } from '@/lib/db';
import { notificationService } from '@/services/core/notificationService';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    getMainCV: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn() },
}));

// Mirrors the real Dexie `creating` hook, which mutates the caller's object and
// deletes `parsedData` after compressing it into `compressedData`.
const compressOnCreate = async (obj: Record<string, unknown>) => {
  if (obj.parsedData) {
    obj.compressedData = 'compressed';
    delete obj.parsedData;
  }
  return 7;
};

const mockResumes = db.resumes as unknown as {
  toArray: Mock;
  add: Mock;
  update: Mock;
  delete: Mock;
};
const mockGetMainCV = db.getMainCV as unknown as Mock;
const resumesApi = mockResumes;

const confirm = vi.mocked(notificationService.confirm);
const toastError = vi.mocked(toast.error);

const existingResume = {
  id: 1,
  createdAt: 1,
  fileName: 'Existing',
  rawText: '',
  formatted: true,
  isMain: true,
};

describe('useCVResumes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumesApi.toArray.mockResolvedValue([existingResume]);
    resumesApi.add.mockImplementation(compressOnCreate);
    mockGetMainCV.mockResolvedValue(existingResume);
    confirm.mockResolvedValue(true);
  });

  it('keeps parsedData on the in-memory resume returned by handleCreateNewCV', async () => {
    const { result } = renderHook(() => useCVResumes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: Awaited<ReturnType<typeof result.current.handleCreateNewCV>> | undefined;
    await act(async () => {
      created = await result.current.handleCreateNewCV();
    });

    // The db row only keeps the compressed blob, but React state needs parsedData
    // or Preview renders "No CV to preview" immediately after creating a CV.
    expect(resumesApi.add.mock.calls[0][0]).not.toHaveProperty('parsedData');
    expect(created?.parsedData).toBeDefined();
    expect(created?.id).toBe(7);
  });

  it('surfaces a toast and does not reject when refreshResumes fails', async () => {
    const { result } = renderHook(() => useCVResumes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    resumesApi.toArray.mockRejectedValueOnce(new Error('db offline'));

    let returned: unknown = 'unset';
    await act(async () => {
      returned = await result.current.refreshResumes();
    });

    expect(returned).toBeNull();
    expect(toastError).toHaveBeenCalledWith('Could not refresh the CV list. Please try again.');
    // Previous list is preserved rather than blanked.
    expect(result.current.resumes).toHaveLength(1);
  });

  it('reports a failed rename and leaves state untouched', async () => {
    const { result } = renderHook(() => useCVResumes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    resumesApi.update.mockRejectedValueOnce(new Error('db offline'));

    let ok: unknown;
    await act(async () => {
      ok = await result.current.handleRenameCV(1, 'Renamed');
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith('Could not rename the CV. Please try again.');
    expect(result.current.resumes[0].fileName).toBe('Existing');
  });

  it('reports a failed create without rejecting', async () => {
    const { result } = renderHook(() => useCVResumes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    resumesApi.add.mockRejectedValueOnce(new Error('db offline'));

    let created: unknown = 'unset';
    await act(async () => {
      created = await result.current.handleCreateNewCV();
    });

    expect(created).toBeNull();
    expect(toastError).toHaveBeenCalledWith('Could not create a new CV. Please try again.');
    expect(result.current.resumes).toHaveLength(1);
  });

  it('reports a failed delete and keeps the CV selected', async () => {
    const { result } = renderHook(() => useCVResumes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    resumesApi.delete.mockRejectedValueOnce(new Error('db offline'));

    let deleted: unknown;
    await act(async () => {
      deleted = await result.current.handleDeleteCurrentCV();
    });

    expect(deleted).toBe(false);
    expect(toastError).toHaveBeenCalledWith('Could not delete the CV. Please try again.');
    expect(result.current.resumes).toHaveLength(1);
    expect(result.current.chatResumeId).toBe(1);
  });

  it('keeps the optimistic mainCV when a manual update fails', async () => {
    const { result } = renderHook(() => useCVResumes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    resumesApi.update.mockRejectedValueOnce(new Error('db offline'));

    await act(async () => {
      await result.current.handleManualUpdate({
        basics: { name: 'Ada' },
      } as never);
    });

    expect(toastError).toHaveBeenCalledWith(
      'Could not save your changes. Please try again.',
      expect.objectContaining({ id: 'cv-manual-update-error' })
    );
    expect(result.current.mainCV?.parsedData?.basics.name).toBe('Ada');
  });
});
