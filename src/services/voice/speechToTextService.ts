import { VoiceSettings } from '@/types';
import { logger } from '@/lib/logger';

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type STTCallback = (result: STTResult) => void;
export type STTErrorCallback = (error: string) => void;
/** Fired when the recogniser auto-stops because the user went silent. */
export type STTSilenceCallback = () => void;

/**
 * Fallback used when no silence timeout is configured. 4s is long enough to
 * absorb the pauses between words/sentences without cutting the candidate off
 * mid-thought.
 */
export const DEFAULT_SILENCE_TIMEOUT_MS = 4000;

/** Timer handle for the silence window, valid in both DOM and Node typings. */
type SilenceTimer = ReturnType<typeof setTimeout>;

class SpeechToTextService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onResultCallback: STTCallback | null = null;
  private onErrorCallback: STTErrorCallback | null = null;
  private silenceTimer: SilenceTimer | undefined;
  private onSilenceCallback: STTSilenceCallback | null = null;

  // Configuration
  private config: VoiceSettings | null = null;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true; // We handle silence detection manually if needed
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          confidence = result[0].confidence;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Reset silence timer on any speech
      this.resetSilenceTimer();

      if (this.onResultCallback) {
        this.onResultCallback({
          transcript: finalTranscript || interimTranscript,
          isFinal: !!finalTranscript,
          confidence: confidence,
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      logger.error('Speech recognition error', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
      this.stop();
    };

    this.recognition.onend = () => {
      // If we are supposed to be listening (e.g. continuous mode logic not handled here but in UI),
      // check state. But here we mainly expose start/stop.
      if (this.isListening) {
        // Sometimes it stops automatically, maybe we want to restart?
        // For now, let's just mark as stopped.
        this.isListening = false;
      }
    };
  }

  public setConfig(config: VoiceSettings) {
    this.config = config;
    if (this.recognition) {
      this.recognition.lang = config.language;
    }
  }

  public start(onResult: STTCallback, onError: STTErrorCallback) {
    if (!this.recognition) {
      onError('Speech Recognition not support');
      return;
    }

    if (this.isListening) return;

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
      this.isListening = true;
      this.resetSilenceTimer();
    } catch (e) {
      logger.error('Failed to start recognition:', e);
      onError('Failed to start recording');
    }
  }

  public stop() {
    if (!this.recognition || !this.isListening) return;

    this.recognition.stop();
    this.isListening = false;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = undefined;
  }

  public abort() {
    if (!this.recognition) return;
    this.recognition.abort();
    this.isListening = false;
    clearTimeout(this.silenceTimer);
    this.silenceTimer = undefined;
  }

  /**
   * Register a callback fired when recognition stops itself after a silence
   * window, so consumers can reflect the dead recogniser in their UI.
   */
  public setOnSilenceCallback(callback: STTSilenceCallback | null) {
    this.onSilenceCallback = callback;
  }

  private resetSilenceTimer() {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = undefined;

    if (this.config && this.config.silenceTimeout > 0) {
      this.silenceTimer = setTimeout(() => {
        this.silenceTimer = undefined;
        if (!this.isListening) return;

        this.stop();
        this.onSilenceCallback?.();
      }, this.config.silenceTimeout);
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }
}

export const speechToTextService = new SpeechToTextService();
