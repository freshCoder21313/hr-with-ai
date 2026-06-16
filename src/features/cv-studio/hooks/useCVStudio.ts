import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Resume, Message } from '@/types';
import { ResumeData } from '@/types/resume';
import { streamCVChatMessage } from '@/services/resume/cvChatService';
import { extractProposedChanges, ProposedChange } from '../utils/cvChatUtils';
import { useJobStore, Job } from '../stores/useJobStore';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { tailorResumeV2, parseResumeToJSON } from '@/services/resume/resumeAIService';
import { ROOT_PROMPT } from '@/services/ai/rootPrompt';

export type JobProcessStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface JobWithStatus extends Job {
  status: JobProcessStatus;
  resultId?: number;
  error?: string;
}

export type TemplateType = 'modern' | 'classic' | 'creative' | 'minimalist' | 'academic';

const ALLOWED_SECTIONS = [
  'basics', 'work', 'education', 'skills', 'projects', 'languages',
  'interests', 'references', 'volunteer', 'awards', 'publications', 'meta',
];

export const useCVStudio = () => {
  const [isJobPanelOpen, setIsJobPanelOpen] = useState(true);
  const [previewViewMode, setPreviewViewMode] = useState<'preview' | 'form' | 'split'>('preview');
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [activeTab, setActiveTab] = useState('basics');
  const [showReorderDialog, setShowReorderDialog] = useState(false);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [mainCV, setMainCV] = useState<Resume | null>(null);
  const [chatResumeId, setChatResumeId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ProposedChange[] | null>(null);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  const [contextResumeId, setContextResumeId] = useState<number | undefined>();
  const [contextJobId, setContextJobId] = useState<string | undefined>();

  const jobs = useJobStore((s) => s.jobs);
  const globalPrompt = useJobStore((s) => s.globalPrompt);
  const jobActions = useJobStore((s) => s.actions);
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [processingStatus, setProcessingStatus] = useState<Record<string, Partial<JobWithStatus>>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const all = await db.resumes.toArray();
        const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
        setResumes(sorted);

        const main = sorted.find((r) => r.isMain) || sorted[0];
        if (main) setSelectedResumeId(main.id);

        const cv = await db.getMainCV();
        if (cv) {
          setMainCV(cv);
          setChatResumeId(cv.id);
          setMessages([{
            role: 'model',
            content: `Hello! I'm your CV assistant. Currently working on **${cv.fileName}**.\n\nSwitch to **Tailor mode** to auto-tailor this CV for specific jobs, or stay in **Chat mode** to edit it manually via AI chat.`,
            timestamp: Date.now(),
          }]);
        } else if (sorted.length > 0) {
          const first = sorted[0];
          setMainCV(first);
          setChatResumeId(first.id);
          setMessages([{
            role: 'model',
            content: `Hello! Working on **${first.fileName}**. How can I help you today?`,
            timestamp: Date.now(),
          }]);
        }
      } catch (err) {
        console.error('Failed to load studio data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSendMessage = async (text: string, image?: string) => {
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

      const otherResumes = resumes.filter((r) => r.id !== chatResumeId && r.id !== contextResumeId);
      if (otherResumes.length > 0) {
        additionalContext += `\nOTHER AVAILABLE CVs: ${otherResumes.map((r) => r.fileName).join(', ')}\n`;
      }

      const stream = streamCVChatMessage(
        messages.concat(userMsg), text, mainCV.parsedData, config, additionalContext
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

      setMessages((prev) => prev.map((m) => (m.timestamp === aiMsgId ? { ...m, content: cleaned } : m)));

      if (changes?.length) {
        setPendingChanges((prev) => [...(prev || []), ...changes]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.timestamp === aiMsgId
            ? { ...m, content: 'Sorry, I encountered an error processing your request. Please check your connection and API key.' }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleAcceptChange = async (change: ProposedChange) => {
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
    const updated = { ...mainCV.parsedData, [change.section]: change.newData };
    await db.resumes.update(mainCV.id!, { parsedData: updated });
    setMainCV({ ...mainCV, parsedData: updated });
    setPendingChanges((prev) => {
      const next = (prev || []).filter((c) => c !== change);
      return next.length ? next : null;
    });
  };

  const handleRejectChange = (change: ProposedChange) => {
    setPendingChanges((prev) => {
      const next = (prev || []).filter((c) => c !== change);
      return next.length ? next : null;
    });
  };

  const handleManualUpdate = async (newData: ResumeData) => {
    if (!mainCV?.id) return;
    setMainCV((prev) => (prev ? { ...prev, parsedData: newData } : null));
    await db.resumes.update(mainCV.id, { parsedData: newData });
  };

  const handleChatCVChange = (id: number) => {
    const cv = resumes.find((r) => r.id === id);
    if (!cv) return;
    setChatResumeId(id);
    setMainCV(cv);
    setPendingChanges(null);
    setMessages([{
      role: 'model',
      content: `Switched to **${cv.fileName}**. How would you like to update it?`,
      timestamp: Date.now(),
    }]);
  };

  const handleGitHubImportComplete = async () => {
    const cv = await db.getMainCV();
    if (cv) {
      setMainCV(cv);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'GitHub projects imported! Check the Projects section.', timestamp: Date.now() },
      ]);
    }
  };

  const handleAddJob = useCallback(() => {
    jobActions.addJob({ company: '', title: '', description: '', customPrompt: '' });
  }, [jobActions]);

  const handleRemoveJob = useCallback((id: string) => {
    jobActions.deleteJob(id);
  }, [jobActions]);

  const updateJob = useCallback((id: string, field: keyof Job, value: string) => {
    const job = jobs.find((j) => j.id === id);
    if (job) jobActions.updateJob({ ...job, [field]: value });
  }, [jobs, jobActions]);

  const handleExportJobs = useCallback(() => {
    const blob = new Blob([JSON.stringify({ jobs, globalPrompt }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hr-jobs-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs, globalPrompt]);

  const handleImportJobs = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const { jobs: importedJobs, globalPrompt: gp } = JSON.parse(ev.target?.result as string);
          jobActions.importJobs(
            importedJobs.map((j: Partial<Job>) => ({
              company: j.company || '', title: j.title || '', description: j.description || '', customPrompt: j.customPrompt || '',
            }))
          );
          jobActions.setGlobalPrompt(gp);
        } catch {
          toast.error('Failed to import jobs.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [jobActions]);

  const handleStartTailoring = async () => {
    const sourceResume = resumes.find((r) => r.id === selectedResumeId);
    if (!sourceResume) {
      toast.error('Please select a source resume.');
      return;
    }
    const jobsToProcess = jobs.filter((j) => selectedJobs.has(j.id));
    if (!jobsToProcess.length) {
      toast.error('Select at least one job.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      openApiKeyModal();
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStatus({});

    let sourceData = sourceResume.parsedData;
    if (!sourceData) {
      try {
        sourceData = await parseResumeToJSON(sourceResume.rawText, config);
        if (sourceResume.id) await db.resumes.update(sourceResume.id, { parsedData: sourceData });
      } catch {
        toast.error('Failed to parse source resume.');
        setIsProcessing(false);
        return;
      }
    }

    for (let i = 0; i < jobsToProcess.length; i++) {
      const job = jobsToProcess[i];
      setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'processing' } }));
      try {
        const finalPrompt = `${ROOT_PROMPT}\n\nYou are an expert Resume Strategist.\n${globalPrompt}${job.customPrompt ? `\n\n--- Job-Specific ---\n${job.customPrompt}` : ''}\n\nSOURCE RESUME:\n${JSON.stringify(sourceData, null, 2)}\n\nTARGET JD:\n${job.description}\n\nReturn valid JSON only, no markdown.`;
        const tailored = await tailorResumeV2(config, finalPrompt);
        const newId = await db.resumes.add({
          createdAt: Date.now(),
          fileName: `[${job.company}] ${job.title} - ${sourceResume.fileName}`,
          rawText: sourceResume.rawText,
          parsedData: tailored,
          formatted: true,
          isMain: false,
        });
        setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'completed', resultId: newId } }));
      } catch {
        setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'error', error: 'Failed.' } }));
      }
      setProgress(Math.round(((i + 1) / jobsToProcess.length) * 100));
    }
    setIsProcessing(false);
  };

  const handleCreateNewCV = useCallback(async () => {
    const newResume: Resume = {
      createdAt: Date.now(),
      fileName: 'New Resume',
      rawText: '',
      parsedData: { basics: { name: '', email: '', label: '', summary: '' }, work: [], education: [], skills: [], projects: [] },
      formatted: true,
      isMain: resumes.length === 0,
    };
    const id = await db.resumes.add(newResume);
    const fullResume = { ...newResume, id };
    setResumes((prev) => [fullResume, ...prev]);
    setChatResumeId(id);
    setMainCV(fullResume);
  }, [resumes.length]);

  const handleDeleteCurrentCV = useCallback(async () => {
    if (!chatResumeId) return;
    if (!confirm('Are you sure you want to delete this CV?')) return;
    await db.resumes.delete(chatResumeId);
    const updated = resumes.filter((r) => r.id !== chatResumeId);
    setResumes(updated);
    if (updated.length > 0) {
      const next = updated[0];
      setChatResumeId(next.id);
      setMainCV(next);
    } else {
      setChatResumeId(undefined);
      setMainCV(null);
    }
  }, [chatResumeId, resumes]);

  const handleToggleJobSelection = (jobId: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const previewData = mainCV?.parsedData ?? resumes.find((r) => r.id === selectedResumeId)?.parsedData;
  const selectedResumeName = resumes.find((r) => r.id === selectedResumeId)?.fileName;

  return {
    state: {
      isLoading, resumes, mainCV, chatResumeId, messages, isTyping,
      pendingChanges, contextResumeId, contextJobId, jobs, globalPrompt,
      selectedResumeId, selectedJobs, processingStatus, isProcessing, progress,
      previewData, selectedResumeName,
    },
    ui: {
      isJobPanelOpen, previewViewMode, template, activeTab,
      showReorderDialog, isGitHubModalOpen, isPromptModalOpen,
      setIsJobPanelOpen, setPreviewViewMode, setTemplate, setActiveTab,
      setShowReorderDialog, setIsGitHubModalOpen, setIsPromptModalOpen,
    },
    actions: {
      setContextResumeId, setContextJobId, setSelectedResumeId,
      handleSendMessage, handleAcceptChange, handleRejectChange,
      handleManualUpdate, handleChatCVChange, handleGitHubImportComplete,
      handleAddJob, handleRemoveJob, updateJob, handleExportJobs,
      handleImportJobs, handleStartTailoring, handleCreateNewCV,
      handleDeleteCurrentCV, handleToggleJobSelection,
      setGlobalPrompt: jobActions.setGlobalPrompt,
    },
  };
};