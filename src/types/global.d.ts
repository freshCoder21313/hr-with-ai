export {};

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any; // We'll keep it as any or a specific type if possible, but window.SpeechRecognition doesn't natively exist in basic TS DOM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
