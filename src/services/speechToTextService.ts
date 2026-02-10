import { VoiceSettings } from '@/types';

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type STTCallback = (result: STTResult) => void;
export type STTErrorCallback = (error: string) => void;

class SpeechToTextService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onResultCallback: STTCallback | null = null;
  private onErrorCallback: STTErrorCallback | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;

  // Configuration
  private config: VoiceSettings | null = null;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
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
      console.error('Speech recognition error', event.error);
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
      console.error('Failed to start recognition:', e);
      onError('Failed to start recording');
    }
  }

  public stop() {
    if (!this.recognition || !this.isListening) return;

    this.recognition.stop();
    this.isListening = false;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
  }

  public abort() {
    if (!this.recognition) return;
    this.recognition.abort();
    this.isListening = false;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    if (this.config && this.config.silenceTimeout > 0) {
      this.silenceTimer = setTimeout(() => {
        // Determine if we should stop.
        // In a real generic service, we might emit a 'silence' event.
        // For now, we assume this service controls the session flow?
        // Better to just let the consumer handle the timeout logic based on results?
        // Re-reading requirements: "Tự động phát hiện khi người dùng ngừng nói (silence detection) để kết thúc input"
        // If we stop here, we should probably treat it as final.
        console.log('Silence detected, stopping...');
        this.stop();
      }, this.config.silenceTimeout);
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }
}

export const speechToTextService = new SpeechToTextService();
