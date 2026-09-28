import { create } from 'zustand';
import { VoiceSettings } from '@/types';
import { DEFAULT_SILENCE_TIMEOUT_MS } from '@/services/voice/speechToTextService';

interface VoiceInterviewState {
  voiceSettings: VoiceSettings;
  currentState: 'idle' | 'listening' | 'processing_stt' | 'waiting_ai' | 'speaking_tts';
  currentTranscript: string;
  interimTranscript: string;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  audioLevel: number;
  ttsQueue: string[]; // Queue of text specific to playback

  // Actions
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setCurrentState: (state: VoiceInterviewState['currentState']) => void;
  updateTranscript: (text: string, isInterim: boolean) => void;
  clearTranscript: () => void;
  addToTTSQueue: (text: string) => void;
  clearTTSQueue: () => void;
  setAudioLevel: (level: number) => void;
  resetState: () => void;
  /**
   * Seed the store from persisted sources (interview row, then user settings).
   * Only fills gaps: values the user already changed in-session win.
   */
  hydrateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  language: 'vi-VN',
  sttProvider: 'web-speech',
  ttsProvider: 'web-speech',
  speechRate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoPlayResponse: true,
  pushToTalk: false,
  silenceTimeout: DEFAULT_SILENCE_TIMEOUT_MS,
};

export const useVoiceInterviewStore = create<VoiceInterviewState>((set) => ({
  voiceSettings: DEFAULT_VOICE_SETTINGS,
  currentState: 'idle',
  currentTranscript: '',
  interimTranscript: '',
  isAISpeaking: false,
  isUserSpeaking: false,
  audioLevel: 0,
  ttsQueue: [],

  setVoiceSettings: (settings) =>
    set((state) => ({
      voiceSettings: { ...state.voiceSettings, ...settings },
    })),

  hydrateVoiceSettings: (settings) =>
    set((state) => ({
      voiceSettings: { ...state.voiceSettings, ...settings },
    })),

  setCurrentState: (state) => set({ currentState: state }),

  updateTranscript: (text, isInterim) =>
    set((state) => ({
      currentTranscript: isInterim ? state.currentTranscript : text,
      interimTranscript: isInterim ? text : '',
    })),

  clearTranscript: () => set({ currentTranscript: '', interimTranscript: '' }),

  addToTTSQueue: (text) =>
    set((state) => ({
      ttsQueue: [...state.ttsQueue, text],
    })),

  clearTTSQueue: () => set({ ttsQueue: [] }),

  setAudioLevel: (level) => set({ audioLevel: level }),

  resetState: () =>
    set({
      currentState: 'idle',
      currentTranscript: '',
      interimTranscript: '',
      isAISpeaking: false,
      isUserSpeaking: false,
      audioLevel: 0,
      ttsQueue: [],
    }),
}));
