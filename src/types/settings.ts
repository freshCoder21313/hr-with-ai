import { AIModelProvider, AIProviderProfile } from './ai';

export interface VoiceSettings {
  language: string; // 'vi-VN' | 'en-US' | ...
  sttProvider: 'web-speech' | 'google-cloud' | 'deepgram';
  ttsProvider: 'web-speech' | 'google-cloud' | 'elevenlabs';
  voiceId?: string; // ID associated with the selected voice
  speechRate: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0 - 1
  autoPlayResponse: boolean;
  pushToTalk: boolean; // true = push-to-talk, false = continuous
  silenceTimeout: number; // ms before auto-stopping recording
}

export interface UserSettings {
  id?: number;
  updatedAt?: number;
  apiKey?: string;
  githubUsername?: string;
  githubToken?: string;
  defaultModel?: string;
  hintsEnabled?: boolean;
  autoFinishEnabled?: boolean;
  forceToolsEnabled?: boolean;
  baseUrl?: string;
  modelId?: string;
  provider?: AIModelProvider;

  // Multi-provider Profiles
  aiProfiles?: AIProviderProfile[];
  activeAIProfileId?: string;
  aiFallbackProfileIds?: string[];

  // Retry Settings
  maxRetries?: number;
  retryDelay?: number; // ms
  retryOnTimeout?: boolean;
  retryOnRateLimit?: boolean;

  // Voice Settings & Keys
  defaultVoiceSettings?: VoiceSettings;
  googleCloudApiKey?: string;
  elevenLabsApiKey?: string;
  deepgramApiKey?: string;
}
