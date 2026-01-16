import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceProps {
  language?: 'en-US' | 'vi-VN';
}

export const useVoice = ({ language = 'en-US' }: UseVoiceProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;
      }
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
             // For interim results, we could update state if we wanted "live" typing effect in input
             // but for now we focus on final results or accumulated interim
             // Ideally, we want to update transcript live
             const interim = event.results[i][0].transcript;
             setTranscript(prev => {
                // simple hack to avoid duplicating interim if appended blindly
                // usually we just replace 'transcript' with the current full buffer from 0
                return interim; 
             });
          }
        }
        // Actually, 'results' contains everything from start if continuous is true?
        // Let's grab the latest result logic more simply for this MVP:
        const current = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setTranscript(current);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn("Speech Recognition not supported in this browser.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
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
  }, [language]);

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
    resetTranscript: () => setTranscript('')
  };
};