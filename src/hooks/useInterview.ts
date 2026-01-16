import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../features/interview/interviewStore';
import { startInterviewSession, streamInterviewMessage, generateInterviewFeedback, getStoredAIConfig } from '../services/geminiService';
import { db } from '../lib/db';
import { InterviewStatus, SetupFormData, Interview, Message } from '@/types';

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
    clearInterview
  } = useInterviewStore();

  const startNewInterview = useCallback(async (data: SetupFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      const config = getStoredAIConfig();
      if (!config.apiKey) {
        throw new Error("API Key is missing. Please set it in Settings.");
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
            timestamp: Date.now()
          }
        ]
      };

      // 2. Save to DB
      const id = await db.interviews.add(initializedInterview);
      initializedInterview.id = id;

      // 3. Set to Store
      setInterview(initializedInterview);
      
      // 4. Navigate
      navigate(`/interview/${id}`);

    } catch (err: any) {
      setError(err.message || "Failed to start interview");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setInterview, setLoading, setError, navigate]);

  const sendMessage = useCallback(async (content: string, image?: string) => {
    if (!currentInterview) return;

    try {
      const config = getStoredAIConfig();
      
      // 1. Add User Message
      const userMsg: Message = {
        role: 'user',
        content,
        timestamp: Date.now(),
        image
      };
      addMessage(userMsg);

      // 2. Prepare Placeholder for AI Message
      const aiMsgPlaceholder: Message = {
        role: 'model',
        content: '', // Start empty for streaming
        timestamp: Date.now() + 1
      };
      addMessage(aiMsgPlaceholder);

      // 3. Stream Response
      let fullResponse = '';
      const stream = streamInterviewMessage(
        [...currentInterview.messages, userMsg], // Current history + new user msg
        content,
        currentInterview,
        config,
        currentInterview.code,
        image
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        updateLastMessage(fullResponse);
      }

      // 4. Update DB (Background)
      if (currentInterview.id) {
         // Create a fresh copy of messages to save
         const updatedMessages = [
             ...currentInterview.messages, 
             userMsg, 
             { ...aiMsgPlaceholder, content: fullResponse }
         ];
         
         await db.interviews.update(currentInterview.id, {
             messages: updatedMessages,
             code: currentInterview.code, // Save latest code too
             whiteboard: currentInterview.whiteboard // Save latest whiteboard
         });
      }

    } catch (err: any) {
      console.error("Error sending message:", err);
      // Optionally add an error message to chat
    }
  }, [currentInterview, addMessage, updateLastMessage]);

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
              feedback
          });
          
          // Update store (though we might just navigate away)
          // We can navigate to feedback view
          navigate(`/feedback/${currentInterview.id}`);
          
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  }, [currentInterview, updateStatus, navigate, setLoading, setError]);

  return {
    startNewInterview,
    sendMessage,
    endSession,
    isLoading: useInterviewStore(state => state.isLoading),
    error: useInterviewStore(state => state.error),
    currentInterview
  };
};
