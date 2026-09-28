import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Each render of the mocked hooks must hand back BRAND NEW function identities,
// exactly like the real `useSpeechToText` / `useAudioRecorder` do.
const stopListening = vi.fn();
const cancelRecording = vi.fn();
const resetService = vi.fn();
const setOnSentenceCallback = vi.fn();

vi.mock('./useSpeechToText', () => ({
  useSpeechToText: () => ({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isSupported: true,
    startListening: () => undefined,
    stopListening: () => stopListening(),
    resetTranscript: () => undefined,
  }),
}));

vi.mock('./useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    isSpeaking: false,
    speak: () => undefined,
    stop: () => undefined,
  }),
}));

vi.mock('./useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    audioLevel: 0,
    startRecording: () => Promise.resolve(),
    stopRecording: () => Promise.resolve(null),
    cancelRecording: () => cancelRecording(),
  }),
}));

vi.mock('@/features/interview/stores/voiceInterviewStore', () => {
  const store = {
    voiceSettings: null,
    currentState: 'idle',
    currentTranscript: '',
    ttsQueue: [],
    audioLevel: 0,
    setCurrentState: () => undefined,
    setVoiceSettings: () => undefined,
    hydrateVoiceSettings: () => undefined,
    updateTranscript: () => undefined,
    clearTranscript: () => undefined,
    addToTTSQueue: () => undefined,
    clearTTSQueue: () => undefined,
    setAudioLevel: () => undefined,
  };
  const useStore = (selector?: (s: typeof store) => unknown) =>
    selector ? selector(store) : store;
  return {
    DEFAULT_VOICE_SETTINGS: {
      language: 'vi-VN',
      sttProvider: 'web-speech',
      ttsProvider: 'web-speech',
      speechRate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoPlayResponse: true,
      pushToTalk: false,
      silenceTimeout: 4000,
    },
    useVoiceInterviewStore: Object.assign(useStore, {
      getState: () => store,
      setState: () => undefined,
    }),
  };
});

vi.mock('@/features/interview/interviewStore', () => ({
  useInterviewStore: () => ({
    currentInterview: null,
    addMessage: () => undefined,
    updateLastMessage: () => undefined,
    setLoading: () => undefined,
    getState: () => ({ isLoading: false }),
  }),
}));

vi.mock('@/services/voice/voiceInterviewService', () => ({
  voiceInterviewService: {
    setOnSentenceCallback: () => setOnSentenceCallback(),
    reset: () => resetService(),
  },
}));

vi.mock('@/services/interview/interviewAIService', () => ({
  streamInterviewMessage: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  getStoredAIConfig: vi.fn(),
}));

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: () => Promise.resolve({}),
}));

vi.mock('@/services/voice/speechToTextService', () => ({
  DEFAULT_SILENCE_TIMEOUT_MS: 4000,
  speechToTextService: { setOnSilenceCallback: () => undefined },
}));

import { useVoiceInterview } from './useVoiceInterview';

describe('useVoiceInterview teardown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not tear down the mic on ordinary re-renders', () => {
    const { rerender } = renderHook(() => useVoiceInterview());

    rerender();
    rerender();
    rerender();

    expect(stopListening).not.toHaveBeenCalled();
    expect(cancelRecording).not.toHaveBeenCalled();
  });

  it('tears down exactly once on unmount', () => {
    const { unmount } = renderHook(() => useVoiceInterview());

    unmount();

    expect(stopListening).toHaveBeenCalledTimes(1);
    expect(cancelRecording).toHaveBeenCalledTimes(1);
    expect(setOnSentenceCallback).toHaveBeenCalledTimes(1);
    expect(resetService).toHaveBeenCalledTimes(1);
  });

  it('unmount cleanup invokes the current stop/cancel implementations', () => {
    const { rerender, unmount } = renderHook(() => useVoiceInterview());

    // Re-render so the refs are refreshed from the latest render, then swap in
    // different implementations to prove the cleanup is not stale.
    rerender();
    const lateStop = vi.fn();
    const lateCancel = vi.fn();
    stopListening.mockImplementation(lateStop);
    cancelRecording.mockImplementation(lateCancel);

    unmount();

    expect(lateStop).toHaveBeenCalledTimes(1);
    expect(lateCancel).toHaveBeenCalledTimes(1);
  });
});
