import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { TemplateType } from '@/types/resume';
import { useJobStore, Job } from '../stores/useJobStore';
import { useCVTailoring } from './useCVTailoring';
import { useCVResumes } from './useCVResumes';
import { useCVChat } from './useCVChat';

export type { JobWithStatus } from './useCVTailoring';

export const useCVStudio = () => {
  const [isJobPanelOpen, setIsJobPanelOpen] = useState(true);
  const [previewViewMode, setPreviewViewMode] = useState<'preview' | 'form' | 'split'>('preview');
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [activeTab, setActiveTab] = useState('basics');
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const jobs = useJobStore((s) => s.jobs);
  const globalPrompt = useJobStore((s) => s.globalPrompt);
  const jobActions = useJobStore((s) => s.actions);

  const resumeState = useCVResumes();
  const chatState = useCVChat({
    mainCV: resumeState.mainCV,
    setMainCV: resumeState.setMainCV,
    resumes: resumeState.resumes,
    jobs,
    chatResumeId: resumeState.chatResumeId,
  });

  const tailoring = useCVTailoring({
    jobs,
    globalPrompt,
    onResumesUpdated: resumeState.setResumes,
  });

  const didInitChat = useRef(false);
  useEffect(() => {
    if (resumeState.isLoading || didInitChat.current || !resumeState.mainCV) return;
    chatState.initializeChat(resumeState.mainCV);
    const main = resumeState.resumes.find((r) => r.isMain) || resumeState.resumes[0];
    if (main?.id) tailoring.setSelectedResumeId(main.id);
    didInitChat.current = true;
  }, [resumeState.isLoading, resumeState.mainCV, resumeState.resumes, chatState, tailoring]);

  const handleChatCVChange = useCallback(
    (id: number) => {
      const cv = resumeState.handleChatCVChange(id);
      if (cv) chatState.resetChatForCV(cv);
    },
    [resumeState, chatState]
  );

  const handleGitHubImportComplete = useCallback(async () => {
    const cv = await resumeState.handleGitHubImportComplete();
    if (cv) {
      chatState.appendSystemMessage('GitHub projects imported! Check the Projects section.');
    }
  }, [resumeState, chatState]);

  const handleAddJob = useCallback(() => {
    jobActions.addJob({ company: '', title: '', description: '', customPrompt: '' });
  }, [jobActions]);

  const handleRemoveJob = useCallback(
    (id: string) => {
      jobActions.deleteJob(id);
    },
    [jobActions]
  );

  const updateJob = useCallback(
    (id: string, field: keyof Job, value: string) => {
      const job = jobs.find((j) => j.id === id);
      if (job) jobActions.updateJob({ ...job, [field]: value });
    },
    [jobs, jobActions]
  );

  const handleExportJobs = useCallback(() => {
    const blob = new Blob([JSON.stringify({ jobs, globalPrompt }, null, 2)], {
      type: 'application/json',
    });
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
              company: j.company || '',
              title: j.title || '',
              description: j.description || '',
              customPrompt: j.customPrompt || '',
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

  const previewData =
    resumeState.mainCV?.parsedData ??
    resumeState.resumes.find((r) => r.id === tailoring.selectedResumeId)?.parsedData;
  const selectedResumeName = resumeState.resumes.find(
    (r) => r.id === tailoring.selectedResumeId
  )?.fileName;

  return {
    state: {
      isLoading: resumeState.isLoading,
      resumes: resumeState.resumes,
      mainCV: resumeState.mainCV,
      chatResumeId: resumeState.chatResumeId,
      messages: chatState.messages,
      isTyping: chatState.isTyping,
      pendingChanges: chatState.pendingChanges,
      contextResumeId: chatState.contextResumeId,
      contextJobId: chatState.contextJobId,
      jobs,
      globalPrompt,
      selectedResumeId: tailoring.selectedResumeId,
      selectedJobs: tailoring.selectedJobs,
      processingStatus: tailoring.processingStatus,
      isProcessing: tailoring.isProcessing,
      progress: tailoring.progress,
      previewData,
      selectedResumeName,
    },
    ui: {
      isJobPanelOpen,
      previewViewMode,
      template,
      activeTab,
      showReorderDialog,
      isGitHubModalOpen,
      isPromptModalOpen,
      setIsJobPanelOpen,
      setPreviewViewMode,
      setTemplate,
      setActiveTab,
      setShowReorderDialog,
      setIsGitHubModalOpen,
      setIsPromptModalOpen,
    },
    actions: {
      setContextResumeId: chatState.setContextResumeId,
      setContextJobId: chatState.setContextJobId,
      setSelectedResumeId: tailoring.setSelectedResumeId,
      handleSendMessage: chatState.handleSendMessage,
      handleAcceptChange: chatState.handleAcceptChange,
      handleRejectChange: chatState.handleRejectChange,
      handleManualUpdate: resumeState.handleManualUpdate,
      handleRenameCV: resumeState.handleRenameCV,
      handleChatCVChange,
      handleGitHubImportComplete,
      handleAddJob,
      handleRemoveJob,
      updateJob,
      handleExportJobs,
      handleImportJobs,
      handleStartTailoring: () => tailoring.handleStartTailoring(resumeState.resumes),
      handleCreateNewCV: resumeState.handleCreateNewCV,
      handleDeleteCurrentCV: resumeState.handleDeleteCurrentCV,
      handleToggleJobSelection: tailoring.handleToggleJobSelection,
      setGlobalPrompt: jobActions.setGlobalPrompt,
    },
  };
};
