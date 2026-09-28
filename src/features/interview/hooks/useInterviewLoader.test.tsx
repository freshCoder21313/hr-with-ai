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
});
