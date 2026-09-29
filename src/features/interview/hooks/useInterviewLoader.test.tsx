import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import { useInterviewLoader } from './useInterviewLoader';
import { useInterviewStore } from '../interviewStore';
import { Interview, InterviewStatus } from '@/types';

vi.mock('@/lib/db');

/** Renders the loader under a route that supplies an :id param. */
function makeWrapper(path: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/interview/:id" element={<>{children}</>} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  };
}

/** No matching route, so useParams() yields no id. */
function makeParamlessWrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={['/elsewhere']}>{children}</MemoryRouter>;
}

const renderLoader = (path: string) =>
  renderHook(() => useInterviewLoader(), { wrapper: makeWrapper(path) });

describe('useInterviewLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInterviewStore.setState({ currentInterview: null });
  });

  it('surfaces "Interview not found" instead of navigating away', async () => {
    vi.mocked(db.interviews.get).mockResolvedValue(undefined);

    const { result } = renderLoader('/interview/999');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Interview not found');
    expect(result.current.interview).toBeNull();
  });

  it('surfaces a load failure message when the read throws', async () => {
    vi.mocked(db.interviews.get).mockRejectedValue(new Error('db offline'));

    const { result } = renderLoader('/interview/7');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load interview');
  });

  it('reports a missing id rather than loading nothing silently', async () => {
    const { result } = renderHook(() => useInterviewLoader(), {
      wrapper: makeParamlessWrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('No interview ID provided');
  });

  it('clears the error and exposes the interview on a successful load', async () => {
    const interview: Interview = {
      id: 3,
      createdAt: Date.now(),
      jobTitle: 'Engineer',
      company: 'Acme',
      status: InterviewStatus.IN_PROGRESS,
      messages: [],
      interviewerPersona: 'p',
      jobDescription: 'd',
      resumeText: 'r',
      language: 'vi-VN',
    };
    vi.mocked(db.interviews.get).mockResolvedValue(interview);

    const { result } = renderLoader('/interview/3');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.interview?.id).toBe(3);
  });

  /**
   * The early return when the store already holds the requested id is
   * load-bearing: during an active session the store holds *newer* state than
   * Dexie (streamed tokens are checkpointed on a throttle, so the DB can lag
   * by seconds). Re-reading would silently roll the user back and discard the
   * in-flight turn.
   */
  it('does not re-read Dexie when the store already holds the requested interview', async () => {
    const storeInterview: Interview = {
      id: 3,
      createdAt: Date.now(),
      jobTitle: 'Engineer',
      company: 'Acme',
      status: InterviewStatus.IN_PROGRESS,
      messages: [{ role: 'user', content: 'in-flight answer', timestamp: 5 }],
      interviewerPersona: 'p',
      jobDescription: 'd',
      resumeText: 'r',
      language: 'en-US',
    };
    useInterviewStore.getState().setInterview(storeInterview);

    const { result } = renderLoader('/interview/3');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(db.interviews.get).not.toHaveBeenCalled();
    expect(result.current.interview?.messages[0].content).toBe('in-flight answer');
  });

  it('reads Dexie when the store holds a different interview', async () => {
    useInterviewStore
      .getState()
      .setInterview({ ...({ id: 3 } as Interview), messages: [] } as Interview);
    const target: Interview = {
      id: 8,
      createdAt: Date.now(),
      jobTitle: 'Engineer',
      company: 'Acme',
      status: InterviewStatus.IN_PROGRESS,
      messages: [],
      interviewerPersona: 'p',
      jobDescription: 'd',
      resumeText: 'r',
      language: 'en-US',
    };
    vi.mocked(db.interviews.get).mockResolvedValue(target);

    const { result } = renderLoader('/interview/8');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(db.interviews.get).toHaveBeenCalledWith(8);
    expect(result.current.interview?.id).toBe(8);
  });

  it('reports not-found rather than returning stale store data when the id matches', async () => {
    // The store is cleared by the loader only on a successful read; a deleted
    // interview must still surface an error instead of rendering a ghost.
    useInterviewStore.getState().setInterview({ ...({ id: 5 } as Interview) } as Interview);
    vi.mocked(db.interviews.get).mockResolvedValue(undefined);

    const { result } = renderLoader('/interview/999');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Interview not found');
  });
});
