import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Resume, Message } from '@/types';
import type { ResumeData } from '@/types/resume';
import { streamCVChatMessage } from '@/services/resume/cvChatService';
import { extractValidatedProposedChanges, ProposedChange } from '../utils/cvChatUtils';
import { Job } from '../stores/useJobStore';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { validateProposedChange } from '@/services/ai/schemas';
import { nextMessageId } from '@/lib/utils';

const ALLOWED_SECTIONS = [
  'basics',
  'work',
  'education',
  'skills',
  'projects',
  'languages',
  'interests',
  'references',
  'volunteer',
  'awards',
  'publications',
  'meta',
];

interface UseCVChatOptions {
  mainCV: Resume | null;
  // The only way chat may persist CV content: it keeps `mainCV` and `resumes[]`
  // in step, so an accepted change survives switching CVs and later saves.
  applyResumeParsedData: (id: number, parsedData: ResumeData) => Promise<void>;
  resumes: Resume[];
  jobs: Job[];
  chatResumeId: number | undefined;
}

export const useCVChat = ({
  mainCV,
  applyResumeParsedData,
  resumes,
  jobs,
  chatResumeId,
}: UseCVChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ProposedChange[] | null>(null);
  const [contextResumeId, setContextResumeId] = useState<number | undefined>();
  // Id of the change whose persistence is in flight, so a double click can only
  // ever start one mutation and the card can disable its own actions.
  const [pendingChangeId, setPendingChangeId] = useState<string | null>(null);
  const [contextJobId, setContextJobId] = useState<string | undefined>();

  const initializeChat = useCallback((cv: Resume) => {
    const isMain = cv.isMain;
    setMessages([
      {
        role: 'model',
        content: isMain
          ? `Hello! I'm your CV assistant. Currently working on **${cv.fileName}**.\n\nSwitch to **Tailor mode** to auto-tailor this CV for specific jobs, or stay in **Chat mode** to edit it manually via AI chat.`
          : `Hello! Working on **${cv.fileName}**. How can I help you today?`,
        timestamp: nextMessageId(),
      },
    ]);
  }, []);

  const resetChatForCV = useCallback((cv: Resume) => {
    setPendingChanges(null);
    setMessages([
      {
        role: 'model',
        content: `Switched to **${cv.fileName}**. How would you like to update it?`,
        timestamp: nextMessageId(),
      },
    ]);
  }, []);

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: 'model', content, timestamp: nextMessageId() }]);
  }, []);

  const removePendingChange = useCallback((change: ProposedChange) => {
    setPendingChanges((prev) => {
      const next = (prev || []).filter((c) => c.id !== change.id);
      return next.length ? next : null;
    });
  }, []);

  const handleSendMessage = useCallback(
    async (text: string, image?: string) => {
      if (!mainCV?.parsedData) return;
      const config = getStoredAIConfig();
      if (!config.apiKey) {
        openApiKeyModal();
        return;
      }

      const userMsg: Message = { role: 'user', content: text, timestamp: nextMessageId(), image };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      const aiMsgId = nextMessageId();
      setMessages((prev) => [...prev, { role: 'model', content: '', timestamp: aiMsgId }]);

      try {
        let additionalContext = '';

        if (contextResumeId) {
          const refCV = resumes.find((r) => r.id === contextResumeId);
          if (refCV?.parsedData) {
            additionalContext += `\nREFERENCE CV (Explicitly selected by user for source information):\n${JSON.stringify(refCV.parsedData, null, 2)}\n`;
          }
        } else {
          const mainCVData = resumes.find((r) => r.isMain && r.id !== chatResumeId);
          if (mainCVData?.parsedData) {
            additionalContext += `\nMAIN CV (Primary reference):\n${JSON.stringify(mainCVData.parsedData, null, 2)}\n`;
          }
        }

        if (contextJobId) {
          const targetJob = jobs.find((j) => j.id === contextJobId);
          if (targetJob) {
            additionalContext += `\nTARGET JOB DESCRIPTION (The goal/requirements the user is aiming for):\nTitle: ${targetJob.title}\nCompany: ${targetJob.company}\nDescription: ${targetJob.description}\n`;
          }
        }

        const otherResumes = resumes.filter(
          (r) => r.id !== chatResumeId && r.id !== contextResumeId
        );
        if (otherResumes.length > 0) {
          additionalContext += `\nOTHER AVAILABLE CVs: ${otherResumes.map((r) => r.fileName).join(', ')}\n`;
        }

        const stream = streamCVChatMessage(
          messages.concat(userMsg),
          text,
          mainCV.parsedData,
          config,
          additionalContext
        );
        let fullResponse = '';
        for await (const chunk of stream) {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.timestamp === aiMsgId ? { ...m, content: fullResponse } : m))
          );
        }

        const { changes, invalidCount } = extractValidatedProposedChanges(fullResponse);
        let cleaned = fullResponse.replace(/```[\s\S]*?```/g, '').trim();

        if (!cleaned || cleaned.length < 5) {
          cleaned = changes?.length
            ? "I've analyzed your request and prepared some updates for your CV. Please review the changes above."
            : "I've processed your request, but no specific data updates were proposed. Let me know if you'd like me to try again with more details.";
        }

        setMessages((prev) =>
          prev.map((m) => (m.timestamp === aiMsgId ? { ...m, content: cleaned } : m))
        );

        if (changes?.length) {
          setPendingChanges((prev) => [...(prev || []), ...changes]);
        }

        if (invalidCount > 0) {
          toast.warning('Some proposed changes were invalid and were skipped.');
        }
      } catch (error) {
        logger.error('Chat error:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.timestamp === aiMsgId
              ? {
                  ...m,
                  content:
                    'Sorry, I encountered an error processing your request. Please check your connection and API key.',
                }
              : m
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [mainCV, messages, resumes, jobs, chatResumeId, contextResumeId, contextJobId]
  );

  const handleAcceptChange = useCallback(
    async (change: ProposedChange) => {
      if (!mainCV?.parsedData || !mainCV.id) return;
      if (pendingChangeId) return;

      setPendingChangeId(change.id);
      try {
        validateProposedChange(change);

        if (!ALLOWED_SECTIONS.includes(change.section)) {
          throw new Error(`Section ${change.section} not allowed for chat updates`);
        }

        const updated = {
          ...mainCV.parsedData,
          [change.section]: change.newData,
        };

        await applyResumeParsedData(mainCV.id, updated);
        removePendingChange(change);
      } catch (error) {
        logger.error('Failed to accept change:', error);
        toast.error('Failed to apply change. Please try again.');
      } finally {
        setPendingChangeId(null);
      }
    },
    [mainCV, applyResumeParsedData, pendingChangeId, removePendingChange]
  );

  const handleRejectChange = useCallback(
    (change: ProposedChange) => {
      // Rejecting while an accept is still persisting would race the write.
      if (pendingChangeId) return;
      removePendingChange(change);
    },
    [pendingChangeId, removePendingChange]
  );

  return {
    messages,
    isTyping,
    pendingChanges,
    contextResumeId,
    pendingChangeId,
    contextJobId,
    setContextResumeId,
    setContextJobId,
    initializeChat,
    resetChatForCV,
    appendSystemMessage,
    handleSendMessage,
    handleAcceptChange,
    handleRejectChange,
  };
};
