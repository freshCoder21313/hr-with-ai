import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVoiceProps {
  language?: 'en-US' | 'vi-VN';
}

export const useVoice = ({ language = 'en-US' }: UseVoiceProps = {}) => {
  const SpeechRecognition = useMemo(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    }
    return null;
  }, []);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, _setIsSupported] = useState(!!SpeechRecognition);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    if (isSupported && SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  }, [language, isSupported, SpeechRecognition]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported) {
      setTranscript('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
        setIsListening(false);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const current = Array.from(event.results)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((result: any) => result[0].transcript)
          .join('');
        setTranscript(current);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
           setIsListening(false);
           alert("Microphone access denied or not supported.");
        }
        // Don't stop listening immediately for 'no-speech' errors in continuous mode
        if (event.error !== 'no-speech') {
             setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        // In continuous mode, sometimes it stops. We might want to restart?
        // For now, let's just update state.
        setIsListening(false);
      };
    } else {
      console.warn('Speech Recognition not supported or not initialized.');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (synthesisRef.current) {
        // Cancel previous speech
        synthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthesisRef.current.speak(utterance);
      }
    },
    [language]
  );

  const cancelSpeech = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    isSpeaking,
    isSupported, // Export this
    resetTranscript: () => setTranscript(''),
  };
};
