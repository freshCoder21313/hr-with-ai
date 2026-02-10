import { useState, useCallback, useEffect } from 'react';
import { speechToTextService, STTResult } from '@/services/speechToTextService';
import { VoiceSettings } from '@/types';

export const useSpeechToText = (config: VoiceSettings) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    speechToTextService.setConfig(config);
  }, [config]);

  const startListening = useCallback(() => {
    setError(null);
    speechToTextService.start(
      (result: STTResult) => {
        if (result.isFinal) {
          setTranscript((prev) => prev + ' ' + result.transcript); // Accumulate? Or Replace?
          // Usually for interview, we might want the whole sentence.
          // Currently service returns final or interim.
          // If final, we append to our local "current turn" transcript
          setInterimTranscript('');
        } else {
          setInterimTranscript(result.transcript);
        }
      },
      (err: string) => {
        setError(err);
        setIsListening(false);
      }
    );
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    speechToTextService.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechToTextService.isSupported(),
  };
};
