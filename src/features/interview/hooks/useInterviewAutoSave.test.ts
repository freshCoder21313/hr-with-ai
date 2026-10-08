import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterviewAutoSave } from './useInterviewAutoSave';
import { useInterviewStore } from '../interviewStore';
import { db } from '@/lib/db';
import { InterviewStatus } from '@/types';

vi.mock('@/lib/db', () => ({
  db: {
    interviews: {
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

describe('useInterviewAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useInterviewStore.setState({
      currentInterview: {
        id: 123,
        company: 'Test Corp',
        jobTitle: 'Software Engineer',
        jobDescription: 'Testing',
        interviewerPersona: 'friendly',
        status: InterviewStatus.IN_PROGRESS,
        createdAt: Date.now(),
        messages: [],
        code: 'initial code',
        whiteboard: 'initial whiteboard',
        resumeText: '',
        language: 'en-US',
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not trigger db update immediately upon mounting', () => {
    renderHook(() => useInterviewAutoSave());
    vi.advanceTimersByTime(2000);
    expect(db.interviews.update).not.toHaveBeenCalled();
  });

  it('auto-saves debounced code updates to Dexie', async () => {
    renderHook(() => useInterviewAutoSave());

    act(() => {
      useInterviewStore.getState().updateCode('new modified code');
    });

    // Advance before debounce delay (1000ms)
    vi.advanceTimersByTime(500);
    expect(db.interviews.update).not.toHaveBeenCalled();

    // Advance past debounce delay
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(db.interviews.update).toHaveBeenCalledWith(
      123,
      expect.objectContaining({ code: 'new modified code' })
    );
  });

  it('auto-saves debounced whiteboard updates to Dexie', async () => {
    renderHook(() => useInterviewAutoSave());

    act(() => {
      useInterviewStore.getState().updateWhiteboard('{"shapes": ["circle"]}');
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(db.interviews.update).not.toHaveBeenCalled();

    // Advance past debounce delay
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(db.interviews.update).toHaveBeenCalledWith(
      123,
      expect.objectContaining({ whiteboard: '{"shapes": ["circle"]}' })
    );
  });
});
