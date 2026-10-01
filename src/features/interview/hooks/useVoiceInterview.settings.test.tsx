import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const setConfig = vi.fn();
const start = vi.fn();
const stop = vi.fn();
let silenceCb: (() => void) | null = null;

vi.mock('@/services/voice/speechToTextService', async () => {
  const actual = await vi.importActual<typeof import('@/services/voice/speechToTextService')>(
    '@/services/voice/speechToTextService'
  );
  return {
    ...actual,
    speechToTextService: {
      setConfig: (...a: unknown[]) => setConfig(...a),
      start: (...a: unknown[]) => start(...a),
      stop: (...a: unknown[]) => stop(...a),
      isSupported: () => true,
      setOnSilenceCallback: (cb: (() => void) | null) => {
        silenceCb = cb;
      },
    },
  };
});

const speak = vi.fn();
vi.mock('@/services/voice/textToSpeechService', () => ({
  textToSpeechService: {
    getVoices: () => [],
    speak: (...a: unknown[]) => speak(...a),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  },
}));

vi.mock('./useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    audioLevel: 0,
    startRecording: () => Promise.resolve(),
    cancelRecording: () => undefined,
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
vi.mock('@/services/interview/interviewAIService', () => ({ streamInterviewMessage: vi.fn() }));
vi.mock('@/services/ai/aiConfigService', () => ({ getStoredAIConfig: vi.fn() }));
vi.mock('@/services/core/settingsService', () => ({ loadUserSettings: () => Promise.resolve({}) }));

const addMessage = vi.fn();
const updateLastMessage = vi.fn();
let storeState: Record<string, unknown> = {};

vi.mock('@/features/interview/interviewStore', () => ({
  useInterviewStore: Object.assign(
    () => ({
      currentInterview: storeState.currentInterview,
      addMessage: (...a: unknown[]) => addMessage(...a),
      updateLastMessage: (...a: unknown[]) => updateLastMessage(...a),
      setLoading: vi.fn(),
    }),
    { getState: () => ({ isLoading: false, currentInterview: storeState.currentInterview }) }
  ),
}));

import { useVoiceInterview } from './useVoiceInterview';
import { useVoiceInterviewStore } from '@/features/interview/stores/voiceInterviewStore';

const toastFn = vi.fn();
vi.mock('sonner', () => ({ toast: { info: (...a: unknown[]) => toastFn(...a), error: vi.fn() } }));

const BASE = {
  language: 'en-US',
  sttProvider: 'web-speech' as const,
  ttsProvider: 'web-speech' as const,
  speechRate: 1,
  pitch: 1,
  volume: 1,
  autoPlayResponse: true,
  pushToTalk: false,
  silenceTimeout: 4000,
};

describe('settings actually reach the live interview', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as never;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    silenceCb = null;
    storeState = { currentInterview: { id: 1, language: 'en-US', messages: [] } };
    act(() => {
      useVoiceInterviewStore.setState({ voiceSettings: { ...BASE }, currentState: 'idle' });
    });
  });

  it('a silenceTimeout written by the store reaches the STT service config', () => {
    const { rerender } = renderHook(() => useVoiceInterview());
    const before = setConfig.mock.calls.at(-1)?.[0]?.silenceTimeout;
    expect(before).toBe(4000);

    // Exactly what VoiceSettingsDialog does on Save.
    act(() => {
      useVoiceInterviewStore.getState().setVoiceSettings({ silenceTimeout: 7500 });
    });
    rerender();

    expect(setConfig.mock.calls.at(-1)?.[0]?.silenceTimeout).toBe(7500);
  });

  it('a speechRate written by the store reaches the TTS speak config', () => {
    const { rerender } = renderHook(() => useVoiceInterview());
    act(() => {
      useVoiceInterviewStore.getState().setVoiceSettings({ speechRate: 1.8 });
    });
    rerender();

    act(() => {
      useVoiceInterviewStore.setState({ ttsQueue: ['hello'], currentState: 'speaking_tts' });
    });
    rerender();

    expect(speak).toHaveBeenCalled();
    expect(speak.mock.calls.at(-1)?.[1]?.speechRate).toBe(1.8);
  });

  it('the silence autostop clears isListening and toasts', () => {
    const { result } = renderHook(() => useVoiceInterview());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      silenceCb?.();
    });

    expect(result.current.isListening).toBe(false);
    expect(toastFn).toHaveBeenCalledWith('Stopped listening — no speech detected.');
  });

  it('an empty transcript toasts instead of dropping the turn silently', async () => {
    const { result } = renderHook(() => useVoiceInterview());
    await act(async () => {
      await result.current.stopAndSend();
    });

    expect(toastFn).toHaveBeenCalledWith("Didn't catch that — try again.");
    expect(addMessage).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });
});
