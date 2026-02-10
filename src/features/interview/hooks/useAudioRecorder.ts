import { useState, useCallback } from 'react';
import { audioRecorderService } from '@/services/audioRecorderService'; // Assuming service is exported as singleton

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const startRecording = useCallback(async () => {
    try {
      await audioRecorderService.startRecording((level) => {
        setAudioLevel(level);
      });
      setIsRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const blob = await audioRecorderService.stopRecording();
      setIsRecording(false);
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      return blob;
    } catch (e) {
      console.error(e);
      setIsRecording(false);
      return null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    audioRecorderService.cancelRecording();
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
  }, []);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
