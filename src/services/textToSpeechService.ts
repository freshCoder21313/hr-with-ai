import { VoiceSettings } from '@/types';

export interface TTSConfig extends VoiceSettings {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

class TextToSpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
    if (this.synth) {
      // Chrome loads voices asynchronously
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.voices = this.synth.getVoices();
          this.isLoaded = true;
        };
      } else {
        this.voices = this.synth.getVoices();
        this.isLoaded = true;
      }
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isLoaded && this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public speak(text: string, config: TTSConfig) {
    if (!this.synth) {
      config.onError?.('TTS not supported');
      return;
    }

    // Cancel any current speaking
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Find voice
    const voice =
      this.getVoices().find((v) => v.voiceURI === config.voiceId) ||
      this.getVoices().find((v) => v.lang === config.language);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = config.speechRate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;
    utterance.lang = config.language; // Fallback if voice not found

    utterance.onstart = () => {
      config.onStart?.();
    };

    utterance.onend = () => {
      config.onEnd?.();
    };

    utterance.onerror = (event) => {
      console.error('TTS Error:', event);
      config.onError?.(event);
    };

    this.synth.speak(utterance);
  }

  public stop() {
    this.synth.cancel();
  }

  public pause() {
    this.synth.pause();
  }

  public resume() {
    this.synth.resume();
  }

  public isSpeaking(): boolean {
    return this.synth.speaking;
  }

  public isPaused(): boolean {
    return this.synth.paused;
  }
}

export const textToSpeechService = new TextToSpeechService();
