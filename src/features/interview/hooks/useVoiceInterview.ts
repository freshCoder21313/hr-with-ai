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
import { getErrorMessage, nextMessageId, withIdleTimeout } from '@/lib/utils';
import { isNonEmptyString } from '@/lib/validation';
import { createStreamPersistence } from '@/features/interview/hooks/interviewStreamPersistence';

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

  const {
    currentInterview,
    addMessage,
    updateMessageByTimestamp,
    markMessageAsError,
    setLoading,
    setError,
    beginGeneration,
    isGenerationCurrent,
    endGeneration,
    setStreamingMessageId,
  } = useInterviewStore();

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
    // Opening the mic mid-turn would capture the AI's own synthesis and hand
    // it back as the user's next answer.
    if (useInterviewStore.getState().activeGenerationId !== null) return;
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

  // `tts`/`stt` are fresh object literals each render, so they are captured in
  // refs to keep the unmount-only teardown from closing over stale instances.
  const ttsRef = useRef(tts);
  useEffect(() => {
    ttsRef.current = tts;
  });

  // Unmount-only teardown. Every owned resource is released: the recogniser,
  // the recorder, the sentence callback feeding TTS, any queued speech, and
  // synthesis already in flight. Switching to text mode unmounts this hook, so
  // without `tts.stop()` the avatar would keep talking over the text room.
  useEffect(() => {
    return () => {
      voiceInterviewService.setOnSentenceCallback(null);
      voiceInterviewService.reset();
      speechToTextService.setOnSilenceCallback(null);
      stopListeningRef.current();
      cancelRecordingRef.current();
      ttsRef.current.stop();
      clearTTSQueue();
      // Store writes only: this cleanup runs after React has discarded the
      // tree, so component state must not be touched here.
      useVoiceInterviewStore.setState({ currentState: 'idle' });
    };
  }, [clearTTSQueue]);

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

      // Claim write ownership *before* the placeholder exists, reusing the same
      // store protocol the text hook uses. Without it, overlapping voice sends
      // both streamed through `updateLastMessage`, so whichever message happened
      // to be last absorbed both answers and either send could clear loading.
      const generationId = beginGeneration();
      const persistence = createStreamPersistence(currentInterview, {
        generationId,
        isGenerationCurrent,
      });

      setCurrentState('waiting_ai');
      setLoading(true);

      // Placeholder for the AI message. Streaming writes are pinned to this
      // timestamp rather than to "whatever is last".
      const streamId = nextMessageId();
      addMessage({ role: 'model', content: '', timestamp: streamId });
      // Marks the turn undelivered so a newer claim resolves it to an explicit
      // error instead of leaving a half-answer looking finished.
      setStreamingMessageId(streamId);

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
        persistence.attachLifecycleFlush();
        const stream = withIdleTimeout(
          streamInterviewMessage(
            priorMessages,
            userText,
            currentInterview,
            config,
            currentInterview.code
          ),
          60000,
          'Voice AI stream stalled.'
        );
        for await (const chunk of stream) {
          fullContent += chunk;

          // A superseded generation must not write into the transcript.
          if (!isGenerationCurrent(generationId)) {
            logger.warn('Discarding voice chunk from a superseded generation:', generationId);
            return;
          }
          updateMessageByTimestamp(streamId, fullContent);
          persistence.checkpoint();
          voiceInterviewService.feedStreamChunk(chunk);
        }

        // Final flush
        voiceInterviewService.flush();
        if (!isGenerationCurrent(generationId)) return;
        updateMessageByTimestamp(streamId, fullContent);
        // The answer is delivered; a newer claim must no longer interrupt it.
        setStreamingMessageId(null);

        await persistence.settleCheckpoints();

        if (!isGenerationCurrent(generationId)) return;

        // Voice turns had no Dexie write at all, so the transcript vanished on
        // reload and the end-session feedback read an empty history.
        try {
          await persistence.persistLiveState();
        } catch (persistErr: unknown) {
          logger.error('Failed to persist voice interview state:', persistErr);
          setError(
            persistErr instanceof Error
              ? `Answer received but could not be saved: ${persistErr.message}`
              : 'Answer received but could not be saved.'
          );
        }
      } catch (error: unknown) {
        logger.error(error);
        // A superseded writer must not overwrite the newer turn's state.
        if (isGenerationCurrent(generationId)) {
          markMessageAsError(streamId, getErrorMessage(error));
          try {
            await persistence.persistLiveState();
          } catch (persistErr: unknown) {
            logger.error('Failed to persist failed voice turn:', persistErr);
          }
        }
        // Only the owning generation resets the room. A superseded writer
        // setting `idle` here would show "Ready" while the newer answer is
        // still streaming.
        if (isGenerationCurrent(generationId)) setCurrentState('idle');
      } finally {
        persistence.detachLifecycleFlush();
        // Only the owning generation releases the turn, so a superseded writer
        // cannot clear loading while the newer answer is still streaming.
        if (isGenerationCurrent(generationId)) {
          endGeneration(generationId);
          setStreamingMessageId(null);
          setLoading(false);
        }
      }
    },
    [
      addMessage,
      updateMessageByTimestamp,
      markMessageAsError,
      setLoading,
      setError,
      beginGeneration,
      isGenerationCurrent,
      endGeneration,
      setStreamingMessageId,
      clearTTSQueue,
      addToTTSQueue,
      setCurrentState,
    ]
  );

  // Action: Send Text Message (Hybrid Mode)
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!isNonEmptyString(text)) return;

      // Single-flight guard: a turn already owns the transcript, and starting
      // a second one would interleave two writers against the same model
      // message. Preserving the user's text matters more than the send.
      if (useInterviewStore.getState().activeGenerationId !== null) {
        toast.info('Still answering the previous message — one moment.');
        return;
      }

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
    // Same single-flight guard as the text path: a rapid second tap while the
    // previous answer streams would otherwise start a competing turn.
    if (useInterviewStore.getState().activeGenerationId !== null) {
      setIsListening(false);
      stt.stopListening();
      recorder.cancelRecording();
      setCurrentState('idle');
      toast.info('Still answering the previous message — one moment.');
      return;
    }

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
    // Ending the call must also drop speech still queued: the hook unmounts
    // shortly after, and anything left would be spoken into the feedback view.
    clearTTSQueue();
    voiceInterviewService.setOnSentenceCallback(null);
    voiceInterviewService.reset();
    setIsListening(false);
    stt.stopListening();
    recorder.cancelRecording();
    setCurrentState('idle');
  }, [tts, stt, recorder, setCurrentState, clearTTSQueue]);

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
