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

export const useInterview = () => {
  const navigate = useNavigate();
  const {
    currentInterview,
    setInterview,
    addMessage,
    updateLastMessage,
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
          mode: data.mode, // Added mode
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
      if (!currentInterview) return;

      try {
        setLoading(true); // Start loading
        const config = getStoredAIConfig();

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
        if (currentInterview.companyStatus) {
          // Calculate turn count (user messages / 2 roughly)
          const turnCount = Math.floor(currentInterview.messages.length / 2);
          systemInjection = getActiveScenario(currentInterview.companyStatus, turnCount);

          if (systemInjection) {
            console.log('🎲 [SCENARIO TRIGGERED]', systemInjection);
          }
        }

        const stream = streamInterviewMessage(
          [...currentInterview.messages, userMsg], // Current history + new user msg
          content,
          currentInterview,
          config,
          currentInterview.code,
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

        // 4. Update DB (Background)
        if (currentInterview.id) {
          // Create a fresh copy of messages to save
          const updatedMessages = [
            ...currentInterview.messages,
            userMsg,
            { ...aiMsgPlaceholder, content: fullResponse },
          ];

          await db.interviews.update(currentInterview.id, {
            messages: updatedMessages,
            code: currentInterview.code, // Save latest code too
            whiteboard: currentInterview.whiteboard, // Save latest whiteboard
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
        // Optionally add an error message to chat
      } finally {
        setLoading(false); // Stop loading
      }
    },
    [currentInterview, addMessage, updateLastMessage, setLoading, endSession] // Added setLoading dependency
  );

  return {
    startNewInterview,
    sendMessage,
    endSession,
    isLoading: useInterviewStore((state) => state.isLoading),
    error: useInterviewStore((state) => state.error),
    currentInterview,
  };
};
