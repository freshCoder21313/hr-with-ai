import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { TemplateType } from '@/types/resume';
import { useJobStore, Job } from '../stores/useJobStore';
import { notificationService } from '@/services/core/notificationService';
import { useCVTailoring } from './useCVTailoring';
import { useCVResumes } from './useCVResumes';
import { useCVChat } from './useCVChat';

export type { JobWithStatus } from './useCVTailoring';

const getQuerySearch = () => {
  if (typeof window === 'undefined') return '';
  if (window.location.search) return window.location.search;
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  return qIndex !== -1 ? hash.slice(qIndex) : '';
};

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

  useEffect(() => {
    jobActions.loadJobsFromDB();
  }, [jobActions]);

  const resumeState = useCVResumes();
  const chatState = useCVChat({
    mainCV: resumeState.mainCV,
    applyResumeParsedData: resumeState.updateResumeParsedData,
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

  const didCheckQueryParams = useRef(false);
  useEffect(() => {
    if (didCheckQueryParams.current || jobs.length === 0) return;
    const querySearch = getQuerySearch();
    if (!querySearch) return;
    const searchParams = new URLSearchParams(querySearch);
    const queryCompany = searchParams.get('company')?.toLowerCase();
    const queryTitle = (searchParams.get('title') || searchParams.get('jobTitle'))?.toLowerCase();
    if (queryCompany || queryTitle) {
      const matched = jobs.find(
        (j) =>
          (!queryCompany || (j.company && j.company.toLowerCase() === queryCompany)) &&
          (!queryTitle ||
            ((j.jobTitle || j.title) && (j.jobTitle || j.title).toLowerCase() === queryTitle))
      );
      if (matched) {
        if (!tailoring.selectedJobs.has(matched.id)) {
          tailoring.handleToggleJobSelection(matched.id);
        }
        chatState.setContextJobId(matched.id);
        didCheckQueryParams.current = true;
      }
    }
  }, [jobs, tailoring, chatState]);

  const handleChatCVChange = useCallback(
    (id: number) => {
      const cv = resumeState.handleChatCVChange(id);
      if (cv) chatState.resetChatForCV(cv);
    },
    [resumeState, chatState]
  );

  const handleSetMainResume = useCallback(
    async (id: number) => {
      const ok = await resumeState.handleSetMainCV(id);
      if (!ok) return;
      // The main CV is both the AI tailoring source and the focused CV, so the
      // preview (which prefers `mainCV`) and chat follow the selection. Skip the
      // chat switch when it is already focused — re-marking must not wipe the thread.
      tailoring.setSelectedResumeId(id);
      if (resumeState.chatResumeId !== id) handleChatCVChange(id);
    },
    [resumeState, tailoring, handleChatCVChange]
  );

  const handleGitHubImportComplete = useCallback(async () => {
    const cv = await resumeState.handleGitHubImportComplete();
    if (cv) {
      chatState.appendSystemMessage('GitHub projects imported! Check the Projects section.');
    }
  }, [resumeState, chatState]);

  const handleAddJob = useCallback(() => {
    jobActions.addJob({
      company: '',
      title: '',
      jobTitle: '',
      description: '',
      jobDescription: '',
      customPrompt: '',
      interviewerPersona: 'Technical Interviewer',
    });
  }, [jobActions]);

  const handleRemoveJob = useCallback(
    async (id: string) => {
      const confirmed = await notificationService.confirm({
        title: 'Delete Job Target',
        message: 'Are you sure you want to remove this job description?',
        variant: 'destructive',
      });
      if (!confirmed) return;
      jobActions.deleteJob(id);
    },
    [jobActions]
  );

  const updateJob = useCallback(
    (id: string, field: keyof Job, value: string) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;

      const updated = { ...job, [field]: value };
      if (field === 'title') updated.jobTitle = value;
      else if (field === 'jobTitle') updated.title = value;
      else if (field === 'description') updated.jobDescription = value;
      else if (field === 'jobDescription') updated.description = value;
      else if (field === 'url') updated.jobUrl = value;
      else if (field === 'jobUrl') updated.url = value;

      jobActions.updateJob(updated);
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
    a.download = 'jobs-backup.json';
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
              title: j.title || j.jobTitle || '',
              jobTitle: j.jobTitle || j.title || '',
              description: j.description || j.jobDescription || '',
              jobDescription: j.jobDescription || j.description || '',
              customPrompt: j.customPrompt || '',
              url: j.url || j.jobUrl,
              jobUrl: j.jobUrl || j.url,
              interviewerPersona: j.interviewerPersona || 'Technical Interviewer',
              companyStatus: j.companyStatus,
              interviewContext: j.interviewContext,
            }))
          );
          if (typeof gp === 'string') jobActions.setGlobalPrompt(gp);
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
      canRetry: chatState.canRetry,
      pendingChanges: chatState.pendingChanges,
      activeQuestionGroup: chatState.activeQuestionGroup,
      activeQuestion: chatState.activeQuestion,
      contextResumeId: chatState.contextResumeId,
      contextJobId: chatState.contextJobId,
      jobs,
      globalPrompt,
      pendingChangeId: chatState.pendingChangeId,
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
      handleRetryLastResponse: chatState.handleRetryLastResponse,
      handleAnswerQuestionGroup: chatState.handleAnswerQuestionGroup,
      handleAnswerQuestion: chatState.handleAnswerQuestion,
      handleSkipQuestion: chatState.handleSkipQuestion,
      handleAcceptChange: chatState.handleAcceptChange,
      handleRejectChange: chatState.handleRejectChange,
      handleManualUpdate: resumeState.handleManualUpdate,
      handleRenameCV: resumeState.handleRenameCV,
      handleReTailorJob: tailoring.handleReTailorJob,
      handleChatCVChange,
      handleSetMainResume,
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
