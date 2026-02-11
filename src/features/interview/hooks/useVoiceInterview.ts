import { useEffect, useRef, useCallback } from 'react';
import { useVoiceInterviewStore } from '@/features/interview/stores/voiceInterviewStore';
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech';
import { useAudioRecorder } from './useAudioRecorder';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { streamInterviewMessage, getStoredAIConfig } from '@/services/geminiService';
import { voiceInterviewService } from '@/services/voiceInterviewService';
import { Message } from '@/types';
import { useParams } from 'react-router-dom';

export const useVoiceInterview = () => {
  // Local state & Context
  // const { id: interviewIdParam } = useParams(); // Unused
  // const interviewId = Number(interviewIdParam);

  const {
    voiceSettings: storeVoiceSettings,
    currentState,
    setCurrentState,
    currentTranscript,
    updateTranscript,
    clearTranscript,
    addToTTSQueue,
    ttsQueue,
    clearTTSQueue,
    setAudioLevel,
  } = useVoiceInterviewStore();

  // Default Fallback Settings
  const defaultVoiceSettings = {
    language: 'en-US',
    sttProvider: 'web-speech',
    ttsProvider: 'web-speech',
    speechRate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoPlayResponse: true,
    pushToTalk: false,
    silenceTimeout: 2000,
  };

  const voiceSettings = storeVoiceSettings || defaultVoiceSettings;

  const { currentInterview, addMessage, updateLastMessage, setLoading, clearInterview } =
    useInterviewStore();

  // Services Hooks
  const stt = useSpeechToText(voiceSettings);
  const tts = useTextToSpeech(voiceSettings);
  const recorder = useAudioRecorder(); // For visualization mainly, and optional recording

  // Audio Visualization Connection
  useEffect(() => {
    setAudioLevel(recorder.audioLevel);
  }, [recorder.audioLevel, setAudioLevel]);

  // Queue Processing for TTS
  useEffect(() => {
    if (ttsQueue.length > 0 && !tts.isSpeaking && currentState === 'speaking_tts') {
      const nextText = ttsQueue[0];
      useVoiceInterviewStore.setState((prev) => ({ ttsQueue: prev.ttsQueue.slice(1) }));

      tts.speak(nextText);
    } else if (ttsQueue.length === 0 && !tts.isSpeaking && currentState === 'speaking_tts') {
      // Finished speaking all queues
      // But wait, Gemini might still be streaming?
      // We need to know if generation is done.
      // Handled in the generation loop.
    }
  }, [ttsQueue, tts.isSpeaking, currentState, tts]);

  // Sync transcript from STT to Store
  useEffect(() => {
    if (stt.transcript || stt.interimTranscript) {
      updateTranscript(
        stt.transcript + (stt.interimTranscript ? ' ' + stt.interimTranscript : ''),
        !!stt.interimTranscript
      );
    }
  }, [stt.transcript, stt.interimTranscript, updateTranscript]);

  // Action: Start Listening
  const startListening = useCallback(async () => {
    setCurrentState('listening');
    clearTranscript();
    stt.resetTranscript();
    stt.startListening();

    // Optional: Start visualizer
    recorder.startRecording().catch(console.error);
  }, [stt, recorder, setCurrentState, clearTranscript]);

  // Process AI Response
  const processAIResponse = useCallback(
    async (userText: string) => {
      // Get fresh state
      const currentInterview = useInterviewStore.getState().currentInterview;
      if (!currentInterview) return;

      setCurrentState('waiting_ai');
      setLoading(true);

      // Create Code Placeholder Message
      addMessage({
        role: 'model',
        content: '', // Streaming fills this
        timestamp: Date.now(),
      });

      // Setup TTS Buffering
      voiceInterviewService.reset();
      clearTTSQueue();

      voiceInterviewService.setOnSentenceCallback((sentence) => {
        addToTTSQueue(sentence);
        if (useVoiceInterviewStore.getState().currentState !== 'speaking_tts') {
          useVoiceInterviewStore.getState().setCurrentState('speaking_tts');
        }
      });

      try {
        const config = getStoredAIConfig();

        // Stream
        let fullContent = '';
        for await (const chunk of streamInterviewMessage(
          currentInterview.messages,
          userText,
          currentInterview,
          config,
          currentInterview.code
        )) {
          fullContent += chunk;
          updateLastMessage(fullContent);
          voiceInterviewService.feedStreamChunk(chunk);
        }

        // Final flush
        voiceInterviewService.flush();
        updateLastMessage(fullContent); // Ensure final consistency

        setLoading(false);
      } catch (error: any) {
        console.error(error);
        updateLastMessage('Error: ' + (error.message || 'Unknown error'));
        setCurrentState('idle');
        setLoading(false);
      }
    },
    [addMessage, updateLastMessage, setLoading, clearTTSQueue, addToTTSQueue, setCurrentState]
  );

  // Action: Send Text Message (Hybrid Mode)
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Add User Message
      const userMsg: Message = {
        role: 'user',
        content: text,
        timestamp: Date.now(),
        isVoiceInput: false,
      };
      addMessage(userMsg);

      // Send to Gemini
      await processAIResponse(text);
    },
    [addMessage, processAIResponse]
  );

  // Action: Stop Listening and Send
  const stopAndSend = useCallback(async () => {
    stt.stopListening();
    recorder.cancelRecording(); // Stop visualizer

    setCurrentState('processing_stt');

    // Wait a bit for final transcript?
    await new Promise((r) => setTimeout(r, 500));

    const textToSend = stt.transcript.trim() || stt.interimTranscript.trim(); // Fallback

    if (!textToSend) {
      setCurrentState('idle'); // No input
      return;
    }

    // Add User Message
    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      isVoiceInput: true,
    };
    addMessage(userMsg);

    // Send to Gemini
    await processAIResponse(textToSend);
  }, [stt, recorder, setCurrentState, addMessage, processAIResponse]);

  // Auto-restart listening when TTS ends (if continuous mode)
  useEffect(() => {
    if (
      currentState === 'speaking_tts' &&
      !tts.isSpeaking &&
      ttsQueue.length === 0 &&
      !useInterviewStore.getState().isLoading
    ) {
      // AI finished speaking
      if (voiceSettings.pushToTalk) {
        setCurrentState('idle');
      } else {
        // Continuous -> Start listening again
        // Add a small delay
        const timer = setTimeout(() => {
          startListening();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentState, tts.isSpeaking, ttsQueue.length, voiceSettings.pushToTalk, startListening]);

  const interruptAI = useCallback(() => {
    tts.stop();
    clearTTSQueue();
    setCurrentState('idle');
    // Maybe cancel Gemini stream if possible? (Simulate by ignoring rest)
    // Hard to cancel generator loop from outside unless built-in support.
  }, [tts, clearTTSQueue, setCurrentState]);

  const toggleMode = useCallback(() => {
    // Switch PTT <-> Continuous
  }, []);

  const endInterview = useCallback(() => {
    tts.stop();
    stt.stopListening();
    recorder.cancelRecording();
    setCurrentState('idle');
    // Any cleanup
  }, [tts, stt, recorder, setCurrentState]);

  return {
    state: currentState,
    transcript: currentTranscript, // Combined final + interim handled by store
    interimTranscript: stt.interimTranscript,
    isListening: stt.isListening,
    isSpeaking: tts.isSpeaking,
    audioLevel: useVoiceInterviewStore((s) => s.audioLevel),
    startListening,
    stopAndSend,
    sendTextMessage,
    interruptAI,
    endInterview,
  };
};
