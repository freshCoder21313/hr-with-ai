import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Interview } from '@/types';
import { generateInterviewHints, InterviewHints } from '@/services/interview/interviewAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';

export function useInterviewHints(currentInterview: Interview | null) {
  const [hints, setHints] = useState<InterviewHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  const handleGetHints = useCallback(async () => {
    if (!currentInterview?.messages?.length) return;

    const lastQuestion = [...currentInterview.messages].reverse().find((m) => m.role === 'model');
    if (!lastQuestion) {
      toast.error('Wait for the interviewer to ask a question first!');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      openApiKeyModal();
      return;
    }

    setIsLoadingHints(true);
    setHints(null);
    try {
      const context = `Role: ${currentInterview.jobTitle} at ${currentInterview.company}. Persona: ${currentInterview.interviewerPersona}. Language: ${currentInterview.language}`;
      const result = await generateInterviewHints(lastQuestion.content, context, config);
      setHints(result);
    } catch (error) {
      logger.error(error);
      toast.error('Failed to get hints. Please try again.');
    } finally {
      setIsLoadingHints(false);
    }
  }, [currentInterview]);

  return { hints, setHints, isLoadingHints, handleGetHints };
}
