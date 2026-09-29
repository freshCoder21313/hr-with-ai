import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '@/features/interview/interviewStore';
import {
  startInterviewSession,
  streamInterviewMessage,
  generateInterviewFeedback,
} from '@/services/interview/interviewAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { db } from '@/lib/db';
import { InterviewStatus, SetupFormData, Interview, Message } from '@/types';
import { getActiveScenario } from '@/features/interview/scenarios';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { isNonEmptyString, validateInterviewSetup } from '@/lib/validation';
import { nextMessageId, withIdleTimeout } from '@/lib/utils';

/**
 * Minimum gap between partial-stream persistence checkpoints. Bounds how much
 * of an in-flight answer is lost to an abrupt tab close, process kill, or
 * WebView suspension without issuing an IndexedDB write per token.
 */
const STREAM_CHECKPOINT_MS = 2000;

/**
 * Maximum gap between two streamed chunks before the generation is treated as
 * failed. Providers only time the request that opens the stream, not the
 * stream body, so without this a stalled connection leaves the interview
 * permanently "processing" with no way back to an idle state.
 */
const STREAM_IDLE_TIMEOUT_MS = 60_000;

/** Grace period so the user can read the closing message before the UI blocks. */
const AUTO_END_DELAY_MS = 2000;

export const useInterview = () => {
  const navigate = useNavigate();
  const {
    currentInterview,
    setInterview,
    addMessage,
    updateMessageByTimestamp,
    markMessageAsError,
    markLastMessageAsError,
    removeLastMessage,
    updateStatus,
    setLoading,
    setError,
    beginGeneration,
    isGenerationCurrent,
    endGeneration,
  } = useInterviewStore();

  const startNewInterview = useCallback(
    async (data: SetupFormData) => {
      try {
        setLoading(true);
        setError(null);

        const validation = validateInterviewSetup(data);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(' '));
        }

        const config = getStoredAIConfig();
        if (!config.apiKey) {
          openApiKeyModal();
          throw new Error('API Key is missing. Please set it in Settings.');
        }

        // Create initial interview object
        const newInterview: Interview = {
          createdAt: Date.now(),
          company: data.company,
          jobTitle: data.jobTitle,
          interviewerPersona: data.interviewerPersona,
          jobDescription: data.jobDescription,
          resumeText: data.resumeText,
          language: data.language,
          difficulty: data.difficulty,
          mode: data.mode || 'text', // Interaction Mode
          type: data.type, // Content Type
          voiceSettings:
            data.mode === 'voice' || data.mode === 'hybrid'
              ? {
                  language: data.language,
                  sttProvider: 'web-speech',
                  ttsProvider: 'web-speech',
                  speechRate: 1.0,
                  pitch: 1.0,
                  volume: 1.0,
                  autoPlayResponse: true,
                  pushToTalk: false,
                  silenceTimeout: 2000,
                }
              : undefined,
          companyStatus: data.companyStatus,
          interviewContext: data.interviewContext,
          status: InterviewStatus.CREATED,
          messages: [],
          code: '// Write your solution here...',
        };

        // 1. Get first message from AI
        const settings = await db.userSettings.orderBy('id').first();
        const firstMessageContent = await startInterviewSession(
          newInterview,
          config,
          settings?.forceToolsEnabled
        );

        const initializedInterview: Interview = {
          ...newInterview,
          status: InterviewStatus.IN_PROGRESS,
          messages: [
            {
              role: 'model',
              content: firstMessageContent,
              timestamp: nextMessageId(),
            },
          ],
        };

        // 2. Save to DB
        const id = await db.interviews.add(initializedInterview);
        initializedInterview.id = id;

        // 3. Set to Store
        setInterview(initializedInterview);

        // 4. Navigate
        navigate(`/interview/${id}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to start interview';
        setError(msg);
        logger.error(err);
      } finally {
        setLoading(false);
      }
    },
    [setInterview, setLoading, setError, navigate]
  );

  const endSession = useCallback(async () => {
    if (!currentInterview || !currentInterview.id) return;

    try {
      setLoading(true);
      updateStatus(InterviewStatus.COMPLETED);

      const config = getStoredAIConfig();
      const feedback = await generateInterviewFeedback(currentInterview, config);

      // Update DB with feedback and status
      await db.interviews.update(currentInterview.id, {
        status: InterviewStatus.COMPLETED,
        feedback,
      });

      // Update store (though we might just navigate away)
      // We can navigate to feedback view
      navigate(`/feedback/${currentInterview.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end interview';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentInterview, updateStatus, navigate, setLoading, setError]);

  const sendMessage = useCallback(
    async (content: string, image?: string) => {
      // Get latest state to avoid closure staleness
      const latestInterview = useInterviewStore.getState().currentInterview;
      if (!latestInterview) return;

      let streamId = 0;
      // Claim write ownership for this generation. Any older in-flight
      // generation is invalidated and its later writes become no-ops.
      const generationId = beginGeneration();
      const interviewId = latestInterview.id;
      // Seeded to "now" so a short response is never checkpointed mid-stream:
      // the final persist already covers it.
      let lastCheckpointAt = Date.now();
      let inFlightCheckpoint: Promise<unknown> = Promise.resolve();

      /**
       * Persists the *live* store snapshot for this interview.
       *
       * Reads through `getState()` rather than a captured snapshot so any
       * mutation that happened during the stream (code editor, whiteboard,
       * extra messages) is included. Skips the write entirely when the
       * generation no longer owns write access or the store has moved to a
       * different interview, so a stale writer can never clobber newer state.
       */
      const persistLiveState = async (): Promise<boolean> => {
        if (!isGenerationCurrent(generationId)) return false;

        const live = useInterviewStore.getState().currentInterview;
        if (!live) return false;
        if (live.id !== undefined && live.id !== interviewId) return false;
        if (interviewId === undefined) return false;

        await db.interviews.update(interviewId, {
          messages: live.messages,
          // Explicit undefined check, not `||`: a user who clears the editor
          // mid-stream must persist that clear, not resurrect the old value.
          code: live.code !== undefined ? live.code : latestInterview.code,
          whiteboard: live.whiteboard !== undefined ? live.whiteboard : latestInterview.whiteboard,
        });
        return true;
      };

      // Lifecycle flush. An IndexedDB write started during `pagehide` is
      // best-effort: this narrows the loss window but cannot make arbitrary
      // OS-level termination durable. `pagehide` means the document is going
      // away and always flushes; `visibilitychange` also fires for ordinary
      // tab switches, so it only flushes when actually backgrounded.
      const flushOnLifecycle = (event: Event) => {
        if (event.type !== 'pagehide' && document.visibilityState !== 'hidden') return;
        void persistLiveState().catch((err: unknown) => {
          logger.error('Failed to flush interview state on lifecycle event:', err);
        });
      };

      try {
        setLoading(true); // Start loading
        const config = getStoredAIConfig();

        if (!config.apiKey) {
          openApiKeyModal();
          setLoading(false);
          return;
        }

        // 1. Add User Message
        const userMsg: Message = {
          role: 'user',
          content,
          timestamp: nextMessageId(),
          image,
        };
        addMessage(userMsg);

        // 2. Prepare Placeholder for AI Message
        streamId = nextMessageId();
        const aiMsgPlaceholder: Message = {
          role: 'model',
          content: '',
          timestamp: streamId,
        };
        addMessage(aiMsgPlaceholder);

        // 3. Stream Response
        let fullResponse = '';

        // Get Auto-Finish Setting
        let autoFinish = false;
        let forceTools = false;
        try {
          const settings = await db.userSettings.orderBy('id').first();
          if (settings?.autoFinishEnabled) autoFinish = true;
          if (settings?.forceToolsEnabled) forceTools = true;
        } catch {
          // Settings load failed, using defaults
        }

        // --- HIDDEN SCENARIO CHECK ---
        let systemInjection: string | null = null;
        if (latestInterview.companyStatus) {
          const turnCount = Math.floor(latestInterview.messages.length / 2);
          systemInjection = getActiveScenario(latestInterview.companyStatus, turnCount);
        }

        // The provider opens the stream under a 30s AbortController but clears
        // it once headers arrive, so a connection that opens and then stalls
        // emits chunks forever. Bound the *consumption* gap instead: the
        // timeout is per-chunk, so a slow but healthy stream still completes.
        const stream = withIdleTimeout(
          streamInterviewMessage(
            [...latestInterview.messages, userMsg], // Use latest history
            content,
            latestInterview,
            config,
            latestInterview.code,
            image,
            autoFinish,
            forceTools,
            systemInjection // Pass the hidden injection
          ),
          STREAM_IDLE_TIMEOUT_MS,
          'The AI provider stopped responding.'
        );

        let shouldAutoEnd = false;

        window.addEventListener('pagehide', flushOnLifecycle);
        document.addEventListener('visibilitychange', flushOnLifecycle);

        for await (const chunk of stream) {
          fullResponse += chunk;

          // Real-time check for token (optimization: check only last N chars)
          if (fullResponse.includes('[[END_SESSION]]')) {
            const cleanContent = fullResponse.replace('[[END_SESSION]]', '').trim();

            // Safety Check: If the message ends with a question mark, IGNORE the auto-finish signal.
            // This prevents the AI from cutting off the user while asking a question (hallucination safeguard).
            if (
              cleanContent.endsWith('?') ||
              cleanContent.endsWith('?"') ||
              cleanContent.endsWith("?'")
            ) {
              // Auto-finish signal detected but ignored because message asks a question
              fullResponse = cleanContent;
              shouldAutoEnd = false;
            } else {
              fullResponse = cleanContent;
              shouldAutoEnd = true;
            }
          }

          // A superseded generation must not write into the transcript.
          if (!isGenerationCurrent(generationId)) {
            logger.warn('Discarding streamed chunk from a superseded generation:', generationId);
            return;
          }
          updateMessageByTimestamp(streamId, fullResponse);

          // Throttled checkpoint: persist partial output so an abrupt tab close
          // or crash loses at most STREAM_CHECKPOINT_MS of the answer, without
          // paying an IndexedDB write per token.
          const now = Date.now();
          if (now - lastCheckpointAt >= STREAM_CHECKPOINT_MS) {
            lastCheckpointAt = now;
            inFlightCheckpoint = persistLiveState().catch((err: unknown) => {
              logger.error('Failed to checkpoint interview during streaming:', err);
            });
          }
        }

        // Let any in-flight checkpoint land before the authoritative write.
        await inFlightCheckpoint;

        // Check if response was empty (silent failure)
        if (!isNonEmptyString(fullResponse)) {
          throw new Error('Received empty response from AI provider.');
        }

        // 4. Persist final state. This reads the live store rather than
        // rebuilding the message list from the pre-stream snapshot, which is
        // what previously erased anything added during the stream.
        if (!isGenerationCurrent(generationId)) {
          logger.warn('Skipping final persist for a superseded generation:', generationId);
          return;
        }
        // A storage failure is not an AI failure: the answer already exists in
        // the store, so it must not be replaced with an error message.
        try {
          await persistLiveState();
        } catch (persistErr: unknown) {
          logger.error('Failed to persist final interview state:', persistErr);
          setError(
            persistErr instanceof Error
              ? `Answer received but could not be saved: ${persistErr.message}`
              : 'Answer received but could not be saved.'
          );
        }

        // 5. Trigger Auto-End if detected
        if (shouldAutoEnd) {
          // Small delay to let the user read the final message before blocking UI.
          // `endSession` closes over a render-time `currentInterview`, so without
          // this identity check a timer left over from a finished interview (or a
          // route change to another one) would finalize the wrong transcript.
          setTimeout(() => {
            const live = useInterviewStore.getState().currentInterview;
            if (!live || live.id !== interviewId) {
              logger.warn('Skipping auto-end: interview changed before the timer fired.');
              return;
            }
            endSession();
          }, AUTO_END_DELAY_MS);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
        logger.error('Error sending message:', err);

        // Mark the placeholder failed in the store *before* persisting, so
        // the failure flag reaches Dexie rather than only living in memory.
        if (isGenerationCurrent(generationId)) {
          if (streamId) {
            markMessageAsError(streamId, msg);
          } else {
            markLastMessageAsError(msg);
          }
          // Persist whatever was produced before the failure so the partial
          // turn is not lost.
          try {
            await persistLiveState();
          } catch (persistErr: unknown) {
            logger.error('Failed to persist partial interview state:', persistErr);
          }
        }
      } finally {
        window.removeEventListener('pagehide', flushOnLifecycle);
        document.removeEventListener('visibilitychange', flushOnLifecycle);
        // Only the owning generation releases ownership and clears the loading
        // flag, so a superseded writer cannot clobber the newer generation.
        if (isGenerationCurrent(generationId)) {
          endGeneration(generationId);
          setLoading(false); // Stop loading
        }
      }
    },
    [
      addMessage,
      updateMessageByTimestamp,
      markMessageAsError,
      markLastMessageAsError,
      setLoading,
      setError,
      endSession,
      beginGeneration,
      isGenerationCurrent,
      endGeneration,
    ]
  );

  const retryLastMessage = useCallback(async () => {
    const latestInterview = useInterviewStore.getState().currentInterview;
    // A generation already owns write access; retrying now would interleave
    // two writers against the same transcript.
    if (useInterviewStore.getState().activeGenerationId !== null) return;
    if (!latestInterview || latestInterview.messages.length === 0) return;

    const messages = latestInterview.messages;
    const lastMsg = messages[messages.length - 1];

    const isErrorOrEmpty =
      lastMsg.role === 'model' && (lastMsg.isError || !isNonEmptyString(lastMsg.content));

    if (isErrorOrEmpty) {
      removeLastMessage();

      const updatedInterviewAfterErrorRemoval = useInterviewStore.getState().currentInterview;
      if (!updatedInterviewAfterErrorRemoval) return;

      const newMessages = updatedInterviewAfterErrorRemoval.messages;
      const lastMsgIndex = newMessages.length - 1;

      if (lastMsgIndex >= 0) {
        const userMsg = newMessages[lastMsgIndex];
        if (userMsg.role === 'user') {
          removeLastMessage();
          await sendMessage(userMsg.content, userMsg.image);
        }
      }
    }
  }, [removeLastMessage, sendMessage]);

  const regenerateLastResponse = useCallback(async () => {
    const latestInterview = useInterviewStore.getState().currentInterview;
    if (useInterviewStore.getState().activeGenerationId !== null) return;
    if (!latestInterview || latestInterview.messages.length < 2) return;

    const messages = latestInterview.messages;
    const lastAiMsg = messages[messages.length - 1];
    const lastUserMsg = messages[messages.length - 2];

    if (lastAiMsg.role !== 'model' || lastUserMsg.role !== 'user') return;

    setLoading(true);
    try {
      removeLastMessage();

      const updatedMessages = useInterviewStore.getState().currentInterview?.messages;
      if (!updatedMessages || updatedMessages.length === 0) return;

      const userMsg = updatedMessages[updatedMessages.length - 1];
      if (userMsg.role !== 'user') return;

      removeLastMessage();

      await sendMessage(userMsg.content, userMsg.image);
    } catch (error) {
      logger.error('Error regenerating response:', error);
      setError((error as Error).message);
    }
  }, [removeLastMessage, sendMessage, setLoading, setError]);

  return {
    startNewInterview,
    sendMessage,
    retryLastMessage,
    regenerateLastResponse,
    endSession,
    isLoading: useInterviewStore((state) => state.isLoading),
    error: useInterviewStore((state) => state.error),
    currentInterview,
  };
};
