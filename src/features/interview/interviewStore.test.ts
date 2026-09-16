import { describe, it, expect, beforeEach } from 'vitest';
import { useInterviewStore } from './interviewStore';
import { InterviewStatus } from '@/types';

describe('useInterviewStore', () => {
  beforeEach(() => {
    useInterviewStore.getState().clearInterview();
  });

  it('should initialize with default state', () => {
    const state = useInterviewStore.getState();
    expect(state.currentInterview).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set interview', () => {
    const mockInterview = { id: 1, messages: [] } as any;
    useInterviewStore.getState().setInterview(mockInterview);
    expect(useInterviewStore.getState().currentInterview).toEqual(mockInterview);
  });

  it('should add message', () => {
    const mockInterview = { id: 1, messages: [] } as any;
    const store = useInterviewStore.getState();
    store.setInterview(mockInterview);
    
    const msg = { role: 'user', content: 'hello', timestamp: 123 } as any;
    useInterviewStore.getState().addMessage(msg);
    
    expect(useInterviewStore.getState().currentInterview?.messages).toHaveLength(1);
    expect(useInterviewStore.getState().currentInterview?.messages[0]).toEqual(msg);
  });

  it('should update last message', () => {
    const mockInterview = { id: 1, messages: [{ content: 'old', role: 'user', timestamp: 1 }] } as any;
    useInterviewStore.getState().setInterview(mockInterview);
    
    useInterviewStore.getState().updateLastMessage('new');
    
    expect(useInterviewStore.getState().currentInterview?.messages[0].content).toBe('new');
  });

  it('should update message by timestamp', () => {
    const mockInterview = { 
      id: 1, 
      messages: [
        { content: 'm1', timestamp: 100, role: 'user' },
        { content: 'm2', timestamp: 200, role: 'user' }
      ] 
    } as any;
    useInterviewStore.getState().setInterview(mockInterview);
    
    useInterviewStore.getState().updateMessageByTimestamp(200, 'updated');
    
    expect(useInterviewStore.getState().currentInterview?.messages[1].content).toBe('updated');
    expect(useInterviewStore.getState().currentInterview?.messages[0].content).toBe('m1');
  });

  it('should mark message as error', () => {
    const mockInterview = { id: 1, messages: [{ timestamp: 100, role: 'model', content: 'wait' }] } as any;
    useInterviewStore.getState().setInterview(mockInterview);
    
    useInterviewStore.getState().markMessageAsError(100, 'fail');
    
    const msg = useInterviewStore.getState().currentInterview?.messages[0];
    expect(msg?.content).toBe('fail');
    expect(msg?.isError).toBe(true);
  });

  it('should update status', () => {
    useInterviewStore.getState().setInterview({ id: 1, messages: [] } as any);
    useInterviewStore.getState().updateStatus(InterviewStatus.COMPLETED);
    expect(useInterviewStore.getState().currentInterview?.status).toBe(InterviewStatus.COMPLETED);
  });

  it('should update code and whiteboard', () => {
    useInterviewStore.getState().setInterview({ id: 1, messages: [] } as any);
    useInterviewStore.getState().updateCode('const x = 1');
    useInterviewStore.getState().updateWhiteboard('data:image');
    
    expect(useInterviewStore.getState().currentInterview?.code).toBe('const x = 1');
    expect(useInterviewStore.getState().currentInterview?.whiteboard).toBe('data:image');
  });
});
