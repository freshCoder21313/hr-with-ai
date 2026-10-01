import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Resume, Message } from '@/types';
import type { ResumeData } from '@/types/resume';
import { streamCVChatMessage } from '@/services/resume/cvChatService';
import {
  extractValidatedProposedChanges,
  cleanChatResponse,
  ProposedChange,
} from '../utils/cvChatUtils';
import { Job } from '../stores/useJobStore';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import {
  validateProposedChange,
  InteractiveQuestion,
  InteractiveQuestionGroup,
} from '@/services/ai/schemas';
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
  const [activeQuestionGroup, setActiveQuestionGroup] = useState<InteractiveQuestionGroup | null>(
    null
  );
  const [contextResumeId, setContextResumeId] = useState<number | undefined>();
  // Id of the change whose persistence is in flight, so a double click can only
  // ever start one mutation and the card can disable its own actions.
  const [pendingChangeId, setPendingChangeId] = useState<string | null>(null);
  const [contextJobId, setContextJobId] = useState<string | undefined>();

  const initializeChat = useCallback((cv: Resume) => {
    const isMain = cv.isMain;
    setActiveQuestionGroup(null);
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
    setActiveQuestionGroup(null);
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

  const canRetry = !isTyping && messages.some((m) => m.role === 'user');

  const buildAdditionalContext = useCallback(() => {
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

    const otherResumes = resumes.filter((r) => r.id !== chatResumeId && r.id !== contextResumeId);
    if (otherResumes.length > 0) {
      additionalContext += `\nOTHER AVAILABLE CVs: ${otherResumes.map((r) => r.fileName).join(', ')}\n`;
    }

    return additionalContext;
  }, [chatResumeId, contextJobId, contextResumeId, jobs, resumes]);

  const executeChatStream = useCallback(
    async (historyWithUser: Message[], text: string, aiMsgId: number) => {
      if (!mainCV?.parsedData) return;
      const config = getStoredAIConfig();

      try {
        const additionalContext = buildAdditionalContext();

        const stream = streamCVChatMessage(
          historyWithUser,
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

        const extraction = extractValidatedProposedChanges(fullResponse);
        const { changes, invalidCount, interactiveQuestionGroup } = extraction;
        let cleaned = cleanChatResponse(fullResponse, extraction);

        if (!cleaned || cleaned.length < 5) {
          if (interactiveQuestionGroup) {
            cleaned =
              interactiveQuestionGroup.questions.length > 1
                ? 'I have a few interactive questions to help improve your CV:'
                : 'I have an interactive question to help improve your CV:';
          } else if (changes?.length) {
            cleaned =
              "I've analyzed your request and prepared some updates for your CV. Please review the changes above.";
          } else {
            cleaned =
              "I've processed your request, but no specific data updates were proposed. Let me know if you'd like me to try again with more details.";
          }
        }

        setMessages((prev) =>
          prev.map((m) => (m.timestamp === aiMsgId ? { ...m, content: cleaned } : m))
        );

        setActiveQuestionGroup(interactiveQuestionGroup ?? null);

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
                  isError: true,
                }
              : m
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [buildAdditionalContext, mainCV]
  );

  const handleSendMessage = useCallback(
    async (text: string, image?: string) => {
      if (!mainCV?.parsedData) return;
      const config = getStoredAIConfig();
      if (!config.apiKey) {
        openApiKeyModal();
        return;
      }

      const userMsg: Message = { role: 'user', content: text, timestamp: nextMessageId(), image };
      const historyWithUser = [...messages, userMsg];
      const aiMsgId = nextMessageId();

      setMessages([...historyWithUser, { role: 'model', content: '', timestamp: aiMsgId }]);
      setIsTyping(true);
      setActiveQuestionGroup(null);

      await executeChatStream(historyWithUser, text, aiMsgId);
    },
    [executeChatStream, mainCV, messages]
  );

  const handleRetryLastResponse = useCallback(async () => {
    if (!mainCV?.parsedData || isTyping) return;
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      openApiKeyModal();
      return;
    }

    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const lastUserMsg = messages[lastUserIndex];
    const historyWithUser = messages.slice(0, lastUserIndex + 1);
    const aiMsgId = nextMessageId();

    setPendingChanges(null);
    setActiveQuestionGroup(null);
    setMessages([...historyWithUser, { role: 'model', content: '', timestamp: aiMsgId }]);
    setIsTyping(true);

    await executeChatStream(historyWithUser, lastUserMsg.content, aiMsgId);
  }, [executeChatStream, isTyping, mainCV, messages]);

  const handleAnswerQuestionGroup = useCallback(
    async (
      group: InteractiveQuestionGroup,
      answers: Record<string, { selectedOptions: string[]; customText?: string }>
    ) => {
      const isMulti = group.questions.length > 1;

      if (!isMulti && group.questions.length === 1) {
        const q = group.questions[0];
        const a = answers[q.id] || { selectedOptions: [] };
        const parts: string[] = [];

        if (a.selectedOptions.length > 0) {
          const optionLabels = a.selectedOptions.map((optId) => {
            const found = q.options?.find((o) => o.id === optId);
            return found ? found.label : optId;
          });
          parts.push(`I selected: ${optionLabels.join(', ')}`);
        }
        if (a.customText?.trim()) {
          if (a.selectedOptions.length > 0) {
            parts.push(`Note: ${a.customText.trim()}`);
          } else {
            parts.push(`Answer: ${a.customText.trim()}`);
          }
        }
        const text = parts.length > 0 ? parts.join('\n') : 'Information confirmed.';
        setActiveQuestionGroup(null);
        await handleSendMessage(text);
        return;
      }

      // Multi-questions formatting
      const lines: string[] = ['I answered the following questions:'];
      let idx = 1;
      group.questions.forEach((q) => {
        const a = answers[q.id];
        if (!a || (a.selectedOptions.length === 0 && !a.customText?.trim())) return;

        const optionLabels = a.selectedOptions.map((optId) => {
          const found = q.options?.find((o) => o.id === optId);
          return found ? found.label : optId;
        });

        const answerSegments: string[] = [];
        if (optionLabels.length > 0) {
          answerSegments.push(optionLabels.join(', '));
        }
        if (a.customText?.trim()) {
          if (optionLabels.length > 0) {
            answerSegments.push(`Note: ${a.customText.trim()}`);
          } else {
            answerSegments.push(a.customText.trim());
          }
        }

        lines.push(`${idx}. ${q.question}: ${answerSegments.join(' - ')}`);
        idx++;
      });

      const text = lines.length > 1 ? lines.join('\n') : 'Information confirmed.';
      setActiveQuestionGroup(null);
      await handleSendMessage(text);
    },
    [handleSendMessage]
  );

  const handleAnswerQuestion = useCallback(
    async (
      question: InteractiveQuestion,
      answer: { selectedOptions: string[]; customText?: string }
    ) => {
      return handleAnswerQuestionGroup(
        { id: question.id, questions: [question], submitLabel: question.submitLabel },
        { [question.id]: answer }
      );
    },
    [handleAnswerQuestionGroup]
  );

  const handleSkipQuestion = useCallback(() => {
    setActiveQuestionGroup(null);
  }, []);

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
    canRetry,
    pendingChanges,
    activeQuestionGroup,
    activeQuestion: activeQuestionGroup?.questions[0] ?? null,
    contextResumeId,
    pendingChangeId,
    contextJobId,
    setContextResumeId,
    setContextJobId,
    initializeChat,
    resetChatForCV,
    appendSystemMessage,
    handleSendMessage,
    handleRetryLastResponse,
    handleAnswerQuestionGroup,
    handleAnswerQuestion,
    handleSkipQuestion,
    handleAcceptChange,
    handleRejectChange,
  };
};
