import { useState, useCallback, useEffect } from 'react';
import { textToSpeechService } from '@/services/textToSpeechService';
import { VoiceSettings } from '@/types';

export const useTextToSpeech = (config: VoiceSettings) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const speak = useCallback(
    (text: string) => {
      setIsSpeaking(true);
      setIsPaused(false);
      textToSpeechService.speak(text, {
        ...config,
        onEnd: () => {
          setIsSpeaking(false);
        },
        onError: (e) => {
          console.error(e);
          setIsSpeaking(false);
        },
      });
    },
    [config]
  );

  const pause = useCallback(() => {
    textToSpeechService.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    textToSpeechService.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    textToSpeechService.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return {
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    stop,
    availableVoices: textToSpeechService.getVoices(),
  };
};
