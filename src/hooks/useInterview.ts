import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../features/interview/interviewStore';
import {
  startInterviewSession,
  streamInterviewMessage,
  generateInterviewFeedback,
  getStoredAIConfig,
} from '../services/geminiService';
import { db } from '../lib/db';
import { InterviewStatus, SetupFormData, Interview, Message } from '@/types';
import { getActiveScenario } from '@/features/interview/scenarios';
import { openApiKeyModal } from '@/events/apiKeyEvents';

export const useInterview = () => {
  const navigate = useNavigate();
  const {
    currentInterview,
    setInterview,
    addMessage,
    updateLastMessage,
    markLastMessageAsError,
    removeLastMessage,
    updateStatus,
    setLoading,
    setError,
  } = useInterviewStore();

  const startNewInterview = useCallback(
    async (data: SetupFormData) => {
      try {
        setLoading(true);
        setError(null);

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
        const firstMessageContent = await startInterviewSession(newInterview, config);

        const initializedInterview: Interview = {
          ...newInterview,
          status: InterviewStatus.IN_PROGRESS,
          messages: [
            {
              role: 'model',
              content: firstMessageContent,
              timestamp: Date.now(),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || 'Failed to start interview');
        console.error(err);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentInterview, updateStatus, navigate, setLoading, setError]);

  const sendMessage = useCallback(
    async (content: string, image?: string) => {
      // Get latest state to avoid closure staleness
      const latestInterview = useInterviewStore.getState().currentInterview;
      if (!latestInterview) return;

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
          timestamp: Date.now(),
          image,
        };
        addMessage(userMsg);

        // 2. Prepare Placeholder for AI Message
        const aiMsgPlaceholder: Message = {
          role: 'model',
          content: '', // Start empty for streaming
          timestamp: Date.now() + 1,
        };
        addMessage(aiMsgPlaceholder);

        // 3. Stream Response
        let fullResponse = '';

        // Get Auto-Finish Setting
        let autoFinish = false;
        try {
          const settings = await db.userSettings.orderBy('id').first();
          if (settings?.autoFinishEnabled) autoFinish = true;
        } catch (e) {
          console.warn('Failed to load settings for auto-finish check', e);
        }

        // --- HIDDEN SCENARIO CHECK ---
        let systemInjection: string | null = null;
        if (latestInterview.companyStatus) {
          // Calculate turn count (user messages / 2 roughly)
          const turnCount = Math.floor(latestInterview.messages.length / 2);
          systemInjection = getActiveScenario(latestInterview.companyStatus, turnCount);

          if (systemInjection) {
            console.log('🎲 [SCENARIO TRIGGERED]', systemInjection);
          }
        }

        const stream = streamInterviewMessage(
          [...latestInterview.messages, userMsg], // Use latest history
          content,
          latestInterview,
          config,
          latestInterview.code,
          image,
          autoFinish,
          systemInjection // Pass the hidden injection
        );

        let shouldAutoEnd = false;

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
              console.warn(
                '⚠️ Auto-finish signal detected but ignored because message asks a question.'
              );
              fullResponse = cleanContent; // Remove token from UI
              shouldAutoEnd = false; // Override: Do NOT end session
            } else {
              fullResponse = cleanContent;
              shouldAutoEnd = true;
            }
          }

          updateLastMessage(fullResponse);
        }

        // Check if response was empty (silent failure)
        if (!fullResponse.trim()) {
          throw new Error('Received empty response from AI provider.');
        }

        // 4. Update DB (Background)
        if (latestInterview.id) {
          // Create a fresh copy of messages to save
          // Note: we need the absolute latest messages including the ones we just added to store
          // But addMessage is async/state update.
          // Actually, we can just construct it here based on logic:
          const updatedMessages = [
            ...latestInterview.messages,
            userMsg,
            { ...aiMsgPlaceholder, content: fullResponse },
          ];

          await db.interviews.update(latestInterview.id, {
            messages: updatedMessages,
            code: latestInterview.code, // Save latest code too
            whiteboard: latestInterview.whiteboard, // Save latest whiteboard
          });
        }

        // 5. Trigger Auto-End if detected
        if (shouldAutoEnd) {
          // Small delay to let the user read the final message before blocking UI
          setTimeout(() => {
            endSession();
          }, 2000);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error sending message:', err);
        // Mark the last message (the placeholder) as error
        markLastMessageAsError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false); // Stop loading
      }
    },
    [
      // Removed currentInterview dependency to avoid stale closure re-creation
      addMessage,
      updateLastMessage,
      markLastMessageAsError,
      setLoading,
      endSession,
    ]
  );

  const retryLastMessage = useCallback(async () => {
    const latestInterview = useInterviewStore.getState().currentInterview;
    if (!latestInterview || latestInterview.messages.length === 0) return;

    const messages = latestInterview.messages;
    const lastMsg = messages[messages.length - 1];

    // Check if last message is error OR empty (from silent failure)
    const isErrorOrEmpty = lastMsg.role === 'model' && (lastMsg.isError || !lastMsg.content.trim());

    if (isErrorOrEmpty) {
      // Remove the error message from UI/Store
      removeLastMessage();

      // Need to fetch state again or rely on index?
      // removeLastMessage updates store synchronously usually in zustand (but React re-render is async)
      // Since we are in an async callback, let's be careful.
      // Actually, removing from store is instant.

      const updatedInterviewAfterErrorRemoval = useInterviewStore.getState().currentInterview;
      if (!updatedInterviewAfterErrorRemoval) return;

      const newMessages = updatedInterviewAfterErrorRemoval.messages;
      const lastMsgIndex = newMessages.length - 1;

      if (lastMsgIndex >= 0) {
        const userMsg = newMessages[lastMsgIndex];
        if (userMsg.role === 'user') {
          // Remove the user message now so sendMessage can re-add it
          removeLastMessage();

          // Wait a tick to ensure store update propagates if needed, though Zustand is sync.
          // Just calling sendMessage now.
          await sendMessage(userMsg.content, userMsg.image);
        }
      }
    }
  }, [removeLastMessage, sendMessage]);

  return {
    startNewInterview,
    sendMessage,
    retryLastMessage,
    endSession,
    isLoading: useInterviewStore((state) => state.isLoading),
    error: useInterviewStore((state) => state.error),
    currentInterview,
  };
};
