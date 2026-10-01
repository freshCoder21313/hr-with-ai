import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCVResumes } from './useCVResumes';
import { useCVChat } from './useCVChat';
import { db } from '@/lib/db';
import type { Resume } from '@/types';
import type { ResumeData } from '@/types/resume';
import type { ProposedChange } from '../utils/cvChatUtils';

vi.mock('@/lib/db', () => ({
  db: {
    resumes: {
      toArray: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(1),
    },
    getMainCV: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

vi.mock('@/services/ai/aiConfigService', () => ({ getStoredAIConfig: () => ({ apiKey: 'k' }) }));

const resumesApi = db.resumes as unknown as { toArray: Mock; update: Mock };

const CV_A_ID = 1;
const CV_B_ID = 2;
const cvA = { id: 1, createdAt: 2, fileName: 'A', parsedData: { basics: { name: 'A' } } } as Resume;
const cvB = { id: 2, createdAt: 1, fileName: 'B', parsedData: { basics: { name: 'B' } } } as Resume;

const change: ProposedChange = {
  id: 'c1',
  section: 'basics',
  action: 'update',
  newData: { name: 'ACCEPTED' },
  explanation: 'rename',
};

const renderStudio = () =>
  renderHook(() => {
    const resumeState = useCVResumes();
    const chatState = useCVChat({
      mainCV: resumeState.mainCV,
      applyResumeParsedData: resumeState.updateResumeParsedData,
      resumes: resumeState.resumes,
      jobs: [],
      chatResumeId: resumeState.chatResumeId,
    });
    return { resumeState, chatState };
  });

describe('accepted chat change vs. CV switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumesApi.toArray.mockResolvedValue([cvA, cvB]);
  });

  it('keeps the accepted change after switching away and back, and on the next save', async () => {
    const { result } = renderStudio();
    await waitFor(() => expect(result.current.resumeState.isLoading).toBe(false));

    await act(async () => {
      await result.current.chatState.handleAcceptChange(change);
    });
    expect(result.current.resumeState.mainCV?.parsedData?.basics.name).toBe('ACCEPTED');

    act(() => {
      result.current.resumeState.handleChatCVChange(CV_B_ID);
    });
    expect(result.current.resumeState.mainCV?.parsedData?.basics.name).toBe('B');

    act(() => {
      result.current.resumeState.handleChatCVChange(CV_A_ID);
    });
    expect(result.current.resumeState.mainCV?.parsedData?.basics.name).toBe('ACCEPTED');

    // A later save (the path that used to overwrite the change with stale content).
    await act(async () => {
      await result.current.resumeState.handleManualUpdate({
        basics: { name: 'ACCEPTED', email: 'a@b.c' },
      } as ResumeData);
    });

    expect(resumesApi.update).toHaveBeenLastCalledWith(cvA.id, {
      parsedData: expect.objectContaining({
        basics: expect.objectContaining({ name: 'ACCEPTED' }),
      }),
    });
    expect(result.current.resumeState.mainCV?.parsedData?.basics.name).toBe('ACCEPTED');
    expect(
      result.current.resumeState.resumes.find((r) => r.id === cvA.id)?.parsedData?.basics.name
    ).toBe('ACCEPTED');
  });

  it('keeps form edits in sync with the CV list too', async () => {
    const { result } = renderStudio();
    await waitFor(() => expect(result.current.resumeState.isLoading).toBe(false));

    await act(async () => {
      await result.current.resumeState.handleManualUpdate({
        basics: { name: 'Edited' },
      } as ResumeData);
    });

    act(() => {
      result.current.resumeState.handleChatCVChange(CV_B_ID);
    });
    act(() => {
      result.current.resumeState.handleChatCVChange(CV_A_ID);
    });

    expect(result.current.resumeState.mainCV?.parsedData?.basics.name).toBe('Edited');
  });
});
