import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type * as SpeechToTextModule from '@/services/voice/speechToTextService';
import type { Interview, Message } from '@/types';

vi.mock('./useSpeechToText', () => ({
  useSpeechToText: () => ({
    transcript: '',
    interimTranscript: '',
    error: null,
    isSupported: true,
    resetTranscript: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
  }),
}));

vi.mock('./useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: false,
  }),
}));

vi.mock('./useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    audioLevel: 0,
    startRecording: () => Promise.resolve(),
    cancelRecording: vi.fn(),
  }),
}));

vi.mock('@/services/voice/voiceInterviewService', () => ({
  voiceInterviewService: {
    setOnSentenceCallback: vi.fn(),
    reset: vi.fn(),
    feedStreamChunk: vi.fn(),
    flush: vi.fn(),
  },
}));

vi.mock('@/services/voice/speechToTextService', async () => {
  const actual = await vi.importActual<typeof SpeechToTextModule>(
    '@/services/voice/speechToTextService'
  );
  return {
    ...actual,
    speechToTextService: {
      ...actual.speechToTextService,
      isSupported: () => true,
      setOnSilenceCallback: vi.fn(),
    },
  };
});

vi.mock('@/services/ai/aiConfigService', () => ({ getStoredAIConfig: () => ({ apiKey: 'k' }) }));
vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: () => Promise.resolve({}),
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn() },
}));

const streamInterviewMessage = vi.fn();
vi.mock('@/services/interview/interviewAIService', () => ({
  streamInterviewMessage: (...args: unknown[]) => streamInterviewMessage(...args),
}));

const addMessage = vi.fn();
const updateLastMessage = vi.fn();
const markLastMessageAsError = vi.fn();
let interview: Interview;

vi.mock('@/features/interview/interviewStore', () => ({
  useInterviewStore: Object.assign(
    () => ({
      currentInterview: interview,
      addMessage,
      updateLastMessage,
      markLastMessageAsError,
      setLoading: vi.fn(),
    }),
    { getState: () => ({ isLoading: false, currentInterview: interview }) }
  ),
}));

import { useVoiceInterview } from './useVoiceInterview';

const makeInterview = (messages: Message[]): Interview => ({
  createdAt: 1,
  company: 'Acme',
  jobTitle: 'Engineer',
  interviewerPersona: 'Friendly',
  jobDescription: 'jd',
  resumeText: 'cv',
  language: 'en-US',
  status: 'in_progress' as Interview['status'],
  messages,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useVoiceInterview turn handling', () => {
  it('passes prior turns only, never duplicating the just-sent user message', async () => {
    const prior: Message[] = [{ role: 'model', content: 'Hello', timestamp: 1 }];
    // The store tail is the message the caller just added.
    interview = makeInterview([...prior, { role: 'user', content: 'My turn', timestamp: 2 }]);
    streamInterviewMessage.mockImplementation(async function* () {
      yield 'ok';
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('My turn');
    });

    expect(addMessage).toHaveBeenCalledWith(expect.objectContaining({ content: 'My turn' }));
    const [history, newMessage] = streamInterviewMessage.mock.calls[0];
    expect(history).toEqual(prior);
    expect(newMessage).toBe('My turn');
  });

  it('marks the streaming turn as an error instead of writing a plain message', async () => {
    interview = makeInterview([{ role: 'user', content: 'Boom', timestamp: 1 }]);
    // An async generator that throws mirrors how the real service surfaces an
    // upstream failure: the `for await` in the hook throws inside its try block.
    streamInterviewMessage.mockImplementation(async function* gen(): AsyncGenerator<string> {
      yield 'partial';
      throw new Error('upstream 500');
    });

    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.sendTextMessage('Boom');
    });

    expect(markLastMessageAsError).toHaveBeenCalledWith('upstream 500');
    expect(updateLastMessage).not.toHaveBeenCalledWith(expect.stringContaining('Error: '));
  });
});
