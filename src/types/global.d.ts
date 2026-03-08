export {};

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    SpeechRecognition: any; // We'll keep it as any or a specific type if possible, but window.SpeechRecognition doesn't natively exist in basic TS DOM
    webkitSpeechRecognition: any;
  }
}
