import { useEffect, useCallback, useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import {
  DEFAULT_VOICE_SETTINGS,
  useVoiceInterviewStore,
} from '@/features/interview/stores/voiceInterviewStore';
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech';
import { useAudioRecorder } from './useAudioRecorder';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { streamInterviewMessage } from '@/services/interview/interviewAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { voiceInterviewService } from '@/services/voice/voiceInterviewService';
import { Message, VoiceSettings } from '@/types';
import { getErrorMessage, nextMessageId } from '@/lib/utils';
import { isNonEmptyString } from '@/lib/validation';
import { loadUserSettings } from '@/services/core/settingsService';
import { speechToTextService } from '@/services/voice/speechToTextService';

export const useVoiceInterview = () => {
  // Local state & Context

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

  const { currentInterview, addMessage, updateLastMessage, markLastMessageAsError, setLoading } =
    useInterviewStore();

  // Seed the store from persisted sources: the user's saved defaults first, then
  // this interview's own voice settings on top. Runs once per interview so a late
  // async load can never clobber the interview's values, and re-renders never
  // overwrite edits made from the settings dialog.
  const interviewId = currentInterview?.id ?? null;
  const hydratedInterviewIdRef = useRef<number | string | null>(null);
  const didLoadUserDefaultsRef = useRef(false);
  useEffect(() => {
    const applyInterviewSettings = () => {
      if (hydratedInterviewIdRef.current === interviewId) return;
      hydratedInterviewIdRef.current = interviewId;

      const interviewSettings = currentInterview?.voiceSettings;
      if (interviewSettings) {
        useVoiceInterviewStore.getState().setVoiceSettings(interviewSettings);
        logger.info('Applied voice settings from interview', interviewId ?? 'unsaved');
      }
    };

    const loadUserDefaults = async () => {
      // One-shot: re-running this would overwrite edits made in the settings
      // dialog with the user's saved defaults.
      if (didLoadUserDefaultsRef.current) return;
      didLoadUserDefaultsRef.current = true;

      const stored = await loadUserSettings().catch((err: unknown) => {
        logger.error('Failed to load default voice settings', err);
        return undefined;
      });
      const defaults = stored?.defaultVoiceSettings;
      if (!defaults) return;
      useVoiceInterviewStore.getState().hydrateVoiceSettings(defaults);
      logger.info('Applied default voice settings from user settings');
      // Re-apply so interview-specific values win over the user defaults.
      applyInterviewSettings();
    };

    if (interviewId !== null) {
      applyInterviewSettings();
    }

    void loadUserDefaults();
  }, [interviewId, currentInterview?.voiceSettings]);

  const voiceSettings: VoiceSettings = {
    ...DEFAULT_VOICE_SETTINGS,
    ...storeVoiceSettings,
    // Override language with the specific interview's language if available
    language:
      currentInterview?.language || storeVoiceSettings?.language || DEFAULT_VOICE_SETTINGS.language,
  };

  // Services Hooks
  const stt = useSpeechToText(voiceSettings);
  const tts = useTextToSpeech(voiceSettings);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  // M8: `useSpeechToText` only learns about silence-stops via this service
  // callback, so this local flag — not `stt.isListening` — drives the mic UI.
  const [isListening, setIsListening] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsQueue.length, tts.isSpeaking, currentState]);

  // Sync transcript from STT to Store
  useEffect(() => {
    if (stt.transcript || stt.interimTranscript) {
      updateTranscript(
        stt.transcript + (stt.interimTranscript ? ' ' + stt.interimTranscript : ''),
        !!stt.interimTranscript
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt.transcript, stt.interimTranscript]);

  // Action: Start Listening
  const startListening = useCallback(async () => {
    setCurrentState('listening');
    setIsListening(true);
    clearTranscript();
    stt.resetTranscript();
    setPermissionError(null);
    stt.startListening();

    // Optional: Start visualizer
    recorder.startRecording().catch((err: unknown) => {
      logger.error('Failed to start recording', err);
      let isPermissionDenied = false;
      if (err instanceof DOMException) {
        isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      } else if (err && typeof err === 'object' && 'name' in err) {
        const errName = err.name;
        isPermissionDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
      }
      if (isPermissionDenied) {
        setPermissionError(
          'Microphone permission denied. Please allow microphone access in your browser settings.'
        );
      } else {
        setPermissionError('Could not access microphone. Please check your audio device.');
      }
      toast.error('Could not access microphone. Please check permissions.');
      setCurrentState('idle');
      setIsListening(false);
      stt.stopListening();
    });
  }, [stt, recorder, setCurrentState, clearTranscript]);

  // Keep teardown handlers pointing at the latest render's functions so the
  // unmount-only cleanup below never closes over stale callbacks.
  const stopListeningRef = useRef(stt.stopListening);
  const cancelRecordingRef = useRef(recorder.cancelRecording);
  useEffect(() => {
    stopListeningRef.current = stt.stopListening;
    cancelRecordingRef.current = recorder.cancelRecording;
  });

  // M8: the recogniser kills itself after a silence window, which used to leave
  // the mic button reading "Tap to Send" forever. Reflect the dead recogniser
  // immediately and settle the state instead of stranding the turn.
  useEffect(() => {
    const onSilenceStop = () => {
      setIsListening(false);
      if (currentStateRef.current === 'idle') return;
      setCurrentState('idle');
      cancelRecordingRef.current();
      toast.info('Stopped listening — no speech detected.');
    };

    speechToTextService.setOnSilenceCallback(onSilenceStop);
    return () => speechToTextService.setOnSilenceCallback(null);
  }, [setCurrentState]);

  // `currentState` is read from a ref inside the silence callback, which is
  // registered once; mirroring it keeps that callback from going stale.
  const currentStateRef = useRef(currentState);
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  // Unmount-only teardown. `stt`/`recorder` are fresh object literals on every
  // render, so depending on them would tear the mic down after each re-render.
  useEffect(() => {
    return () => {
      voiceInterviewService.setOnSentenceCallback(null);
      voiceInterviewService.reset();
      stopListeningRef.current();
      cancelRecordingRef.current();
      setIsListening(false);
    };
  }, []);

  // Process AI Response
  const processAIResponse = useCallback(
    async (userText: string) => {
      // Get fresh state
      const currentInterview = useInterviewStore.getState().currentInterview;
      if (!currentInterview) return;

      // `streamInterviewMessage` appends `userText` itself, so history must be the
      // PRIOR turns only. Both callers add the user message to the store right
      // before this runs, so the store's tail is that message.
      const messages = currentInterview.messages;
      const last = messages[messages.length - 1];
      const priorMessages =
        last && last.role === 'user' && last.content === userText
          ? messages.slice(0, -1)
          : messages;

      setCurrentState('waiting_ai');
      setLoading(true);

      // Create Code Placeholder Message
      addMessage({
        role: 'model',
        content: '', // Streaming fills this
        timestamp: nextMessageId(),
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
          priorMessages,
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
      } catch (error: unknown) {
        logger.error(error);
        markLastMessageAsError(getErrorMessage(error));
        setCurrentState('idle');
        setLoading(false);
      }
    },
    [
      addMessage,
      updateLastMessage,
      markLastMessageAsError,
      setLoading,
      clearTTSQueue,
      addToTTSQueue,
      setCurrentState,
    ]
  );

  // Action: Send Text Message (Hybrid Mode)
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!isNonEmptyString(text)) return;

      // Add User Message
      const userMsg: Message = {
        role: 'user',
        content: text,
        timestamp: nextMessageId(),
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
    setIsListening(false);
    stt.stopListening();
    recorder.cancelRecording(); // Stop visualizer

    setCurrentState('processing_stt');

    // Wait a bit for final transcript?
    await new Promise((r) => setTimeout(r, 500));

    const textToSend = stt.transcript.trim() || stt.interimTranscript.trim(); // Fallback

    if (!isNonEmptyString(textToSend)) {
      // M9: dropping the turn silently read as "heard, thinking" for a full
      // round-trip. Say so instead and hand the mic straight back.
      setCurrentState('idle');
      clearTranscript();
      stt.resetTranscript();
      toast.info("Didn't catch that — try again.");
      return;
    }

    // Add User Message
    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: nextMessageId(),
      isVoiceInput: true,
    };
    addMessage(userMsg);

    // Send to Gemini
    await processAIResponse(textToSend);
  }, [stt, recorder, setCurrentState, addMessage, processAIResponse, clearTranscript]);

  // Auto-restart listening when TTS ends (if continuous mode)
  useEffect(() => {
    if (
      currentState === 'speaking_tts' &&
      !tts.isSpeaking &&
      ttsQueue.length === 0 &&
      !useInterviewStore.getState().isLoading
    ) {
      if (voiceSettings.pushToTalk) {
        setCurrentState('idle');
      } else {
        const timer = setTimeout(() => {
          startListening();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [
    currentState,
    tts.isSpeaking,
    ttsQueue.length,
    voiceSettings.pushToTalk,
    setCurrentState,
    startListening,
  ]);

  const interruptAI = useCallback(() => {
    tts.stop();
    clearTTSQueue();
    setCurrentState('idle');
  }, [tts, clearTTSQueue, setCurrentState]);

  const endInterview = useCallback(() => {
    tts.stop();
    setIsListening(false);
    stt.stopListening();
    recorder.cancelRecording();
    setCurrentState('idle');
    // Any cleanup
  }, [tts, stt, recorder, setCurrentState]);

  return {
    state: currentState,
    transcript: currentTranscript, // Combined final + interim handled by store
    interimTranscript: stt.interimTranscript,
    speechError: stt.error,
    permissionError,
    speechSupported: stt.isSupported,
    isListening,
    isSpeaking: tts.isSpeaking,
    audioLevel: useVoiceInterviewStore((s) => s.audioLevel),
    startListening,
    stopAndSend,
    sendTextMessage,
    interruptAI,
    endInterview,
  };
};
