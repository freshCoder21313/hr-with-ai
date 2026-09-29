import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Collection } from 'dexie';
import { useToolHandlers } from './useToolHandlers';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { db } from '@/lib/db';
import { Interview, InterviewStatus, JobRecommendation, UserSettings } from '@/types';

vi.mock('@/lib/db');
vi.mock('@/lib/svgUtils');
vi.mock('@/lib/logger');

const INTERVIEW_ID = 7;

const makeInterview = (messages: Interview['messages'] = []): Interview => ({
  id: INTERVIEW_ID,
  createdAt: Date.now(),
  jobTitle: 'Original Title',
  company: 'Original Co',
  status: InterviewStatus.IN_PROGRESS,
  messages,
  interviewerPersona: 'p',
  jobDescription: 'original jd',
  resumeText: 'r',
  language: 'en-US',
});

const makeJob = (): JobRecommendation => ({
  id: 'job-1',
  title: 'Senior Engineer',
  company: 'Acme',
  industry: 'tech',
  location: 'Remote',
  salaryRange: '$',
  keyRequirements: [],
  whyItFits: 'fit',
  matchScore: 90,
  jobDescription: 'new jd',
});

describe('useToolHandlers.handleSelectJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.interviews.update).mockResolvedValue(1);
    vi.mocked(db.interviews.put).mockResolvedValue(INTERVIEW_ID);
    vi.mocked(db.userSettings.orderBy).mockReturnValue({
      first: vi.fn().mockResolvedValue(undefined),
    } as unknown as Collection<UserSettings, number>);
    useInterviewStore.setState({
      currentInterview: null,
      isLoading: false,
      error: null,
      activeGenerationId: null,
    });
  });

  const render = (interview: Interview | null) => {
    const setInterview = vi.fn();
    const { result } = renderHook(() => useToolHandlers(interview, false, vi.fn()));
    return { result, setInterview };
  };

  it('does not wipe messages that arrived after the render-time snapshot', async () => {
    const staleSnapshot = makeInterview();
    useInterviewStore.getState().setInterview(staleSnapshot);

    const { result, setInterview } = render(staleSnapshot);

    // Simulate a stream appending a message after the component rendered.
    act(() => {
      useInterviewStore
        .getState()
        .addMessage({ role: 'model', content: 'streamed answer', timestamp: 99 });
    });

    await act(async () => {
      await result.current.handleSelectJob(makeJob(), 'tailored', INTERVIEW_ID, setInterview);
    });

    // The whole-row `put` would have persisted the pre-stream message list.
    expect(db.interviews.put).not.toHaveBeenCalled();
    const updateArg = vi.mocked(db.interviews.update).mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg.jobTitle).toBe('Senior Engineer');
    expect(updateArg.company).toBe('Acme');
    expect(updateArg).not.toHaveProperty('messages');

    const persistedStoreState = setInterview.mock.calls[0][0] as Interview;
    expect(persistedStoreState.messages.map((m) => m.content)).toContain('streamed answer');
  });

  it('does not write when the store has moved to a different interview', async () => {
    useInterviewStore.getState().setInterview(makeInterview());
    const { result, setInterview } = render(makeInterview());

    act(() => {
      useInterviewStore.getState().setInterview({ ...makeInterview(), id: 99 });
    });

    await act(async () => {
      await result.current.handleSelectJob(makeJob(), 'tailored', INTERVIEW_ID, setInterview);
    });

    expect(db.interviews.update).not.toHaveBeenCalled();
    expect(db.interviews.put).not.toHaveBeenCalled();
    expect(setInterview).not.toHaveBeenCalled();
  });
});
