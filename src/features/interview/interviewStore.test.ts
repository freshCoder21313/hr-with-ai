import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterviewStore } from './interviewStore';
import { InterviewStatus, Message, Interview } from '@/types';

describe('useInterviewStore', () => {
  beforeEach(() => {
    useInterviewStore.setState({
      currentInterview: null,
      isLoading: false,
      error: null,
    });
  });

  it('should set an interview', () => {
    const { result } = renderHook(() => useInterviewStore());

    const mockInterview = {
      id: 1,
      createdAt: Date.now(),
      company: 'TestCo',
      jobTitle: 'Software Engineer',
      interviewerPersona: 'Technical Lead',
      jobDescription: 'Test description',
      resumeText: 'Test resume',
      language: 'en-US' as const,
      status: InterviewStatus.CREATED,
      messages: [],
    };

    act(() => {
      result.current.setInterview(mockInterview);
    });

    expect(result.current.currentInterview).toEqual(mockInterview);
  });

  it('should add a message to interview', () => {
    const { result } = renderHook(() => useInterviewStore());

    const mockInterview = {
      id: 1,
      createdAt: Date.now(),
      company: 'TestCo',
      jobTitle: 'Software Engineer',
      interviewerPersona: 'Technical Lead',
      jobDescription: 'Test description',
      resumeText: 'Test resume',
      language: 'en-US' as const,
      status: InterviewStatus.IN_PROGRESS,
      messages: [],
    };

    const mockMessage: Message = {
      role: 'user',
      content: 'Test message',
      timestamp: Date.now(),
    };

    act(() => {
      result.current.setInterview(mockInterview);
      result.current.addMessage(mockMessage);
    });

    expect(result.current.currentInterview?.messages).toHaveLength(1);
    expect(result.current.currentInterview?.messages[0]).toEqual(mockMessage);
  });

  it('should update the last message', () => {
    const { result } = renderHook(() => useInterviewStore());

    const mockInterview: Interview = {
      id: 1,
      createdAt: Date.now(),
      company: 'TestCo',
      jobTitle: 'Software Engineer',
      interviewerPersona: 'Technical Lead',
      jobDescription: 'Test description',
      resumeText: 'Test resume',
      language: 'en-US' as const,
      status: InterviewStatus.IN_PROGRESS,
      messages: [{ role: 'model', content: 'Initial', timestamp: Date.now() }],
    };

    act(() => {
      result.current.setInterview(mockInterview);
      result.current.updateLastMessage('Updated content');
    });

    expect(result.current.currentInterview?.messages[0].content).toBe('Updated content');
  });

  it('should remove last message', () => {
    const { result } = renderHook(() => useInterviewStore());

    const mockInterview: Interview = {
      id: 1,
      createdAt: Date.now(),
      company: 'TestCo',
      jobTitle: 'Software Engineer',
      interviewerPersona: 'Technical Lead',
      jobDescription: 'Test description',
      resumeText: 'Test resume',
      language: 'en-US' as const,
      status: InterviewStatus.IN_PROGRESS,
      messages: [
        { role: 'user', content: 'First', timestamp: Date.now() },
        { role: 'model', content: 'Second', timestamp: Date.now() + 1 },
      ],
    };

    act(() => {
      result.current.setInterview(mockInterview);
      result.current.removeLastMessage();
    });

    expect(result.current.currentInterview?.messages).toHaveLength(1);
    expect(result.current.currentInterview?.messages[0].content).toBe('First');
  });

  it('should update code', () => {
    const { result } = renderHook(() => useInterviewStore());

    const mockInterview: Interview = {
      id: 1,
      createdAt: Date.now(),
      company: 'TestCo',
      jobTitle: 'Software Engineer',
      interviewerPersona: 'Technical Lead',
      jobDescription: 'Test description',
      resumeText: 'Test resume',
      language: 'en-US' as const,
      status: InterviewStatus.IN_PROGRESS,
      messages: [],
      code: '// initial',
    };

    act(() => {
      result.current.setInterview(mockInterview);
      result.current.updateCode('const x = 1;');
    });

    expect(result.current.currentInterview?.code).toBe('const x = 1;');
  });

  it('should clear interview', () => {
    const { result } = renderHook(() => useInterviewStore());

    const mockInterview = {
      id: 1,
      createdAt: Date.now(),
      company: 'TestCo',
      jobTitle: 'Software Engineer',
      interviewerPersona: 'Technical Lead',
      jobDescription: 'Test description',
      resumeText: 'Test resume',
      language: 'en-US' as const,
      status: InterviewStatus.IN_PROGRESS,
      messages: [],
    };

    act(() => {
      result.current.setInterview(mockInterview);
      result.current.clearInterview();
    });

    expect(result.current.currentInterview).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set loading state', () => {
    const { result } = renderHook(() => useInterviewStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should set error state', () => {
    const { result } = renderHook(() => useInterviewStore());

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');
  });
});
