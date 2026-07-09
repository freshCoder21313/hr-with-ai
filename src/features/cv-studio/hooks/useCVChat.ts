import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Resume, Message } from '@/types';
import { ResumeData } from '@/types/resume';
import { streamCVChatMessage } from '@/services/resume/cvChatService';
import { extractProposedChanges, ProposedChange } from '../utils/cvChatUtils';
import { Job } from '../stores/useJobStore';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';

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
  setMainCV: React.Dispatch<React.SetStateAction<Resume | null>>;
  resumes: Resume[];
  jobs: Job[];
  chatResumeId: number | undefined;
}

export const useCVChat = ({ mainCV, setMainCV, resumes, jobs, chatResumeId }: UseCVChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ProposedChange[] | null>(null);
  const [contextResumeId, setContextResumeId] = useState<number | undefined>();
  const [contextJobId, setContextJobId] = useState<string | undefined>();

  const initializeChat = useCallback((cv: Resume) => {
    const isMain = cv.isMain;
    setMessages([
      {
        role: 'model',
        content: isMain
          ? `Hello! I'm your CV assistant. Currently working on **${cv.fileName}**.\n\nSwitch to **Tailor mode** to auto-tailor this CV for specific jobs, or stay in **Chat mode** to edit it manually via AI chat.`
          : `Hello! Working on **${cv.fileName}**. How can I help you today?`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const resetChatForCV = useCallback((cv: Resume) => {
    setPendingChanges(null);
    setMessages([
      {
        role: 'model',
        content: `Switched to **${cv.fileName}**. How would you like to update it?`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: 'model', content, timestamp: Date.now() }]);
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

      const userMsg: Message = { role: 'user', content: text, timestamp: Date.now(), image };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      const aiMsgId = Date.now();
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

        const changes = extractProposedChanges(fullResponse);
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
      } catch (error) {
        console.error('Chat error:', error);
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
      if (!mainCV?.parsedData) return;
      const current = mainCV.parsedData[change.section];
      const isArrExp = Array.isArray(current);
      const isArrRec = Array.isArray(change.newData);
      if (current !== undefined && isArrExp !== isArrRec) {
        toast.error(`Type mismatch for ${change.section}`);
        return;
      }
      if (current === undefined && !ALLOWED_SECTIONS.includes(change.section)) {
        toast.error(`Invalid section: ${change.section}`);
        return;
      }
      const updated = { ...mainCV.parsedData, [change.section]: change.newData } as ResumeData;
      await db.resumes.update(mainCV.id!, { parsedData: updated });
      setMainCV({ ...mainCV, parsedData: updated });
      removePendingChange(change);
    },
    [mainCV, setMainCV, removePendingChange]
  );

  const handleRejectChange = useCallback(
    (change: ProposedChange) => {
      removePendingChange(change);
    },
    [removePendingChange]
  );

  return {
    messages,
    isTyping,
    pendingChanges,
    contextResumeId,
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
