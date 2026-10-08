import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { SetupFormData, Resume, SavedJob } from '@/types';
import { useInterview } from '@/features/interview/hooks/useInterview';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { validateInterviewSetup } from '@/lib/validation';
import { useSetupJobs } from './useSetupJobs';
import { useSetupResumes } from './useSetupResumes';
import { useSetupAIActions } from './useSetupAIActions';
import { ParsedJobData } from '@/services/jobs/jdParser';

interface SkillAssessmentNavigationState {
  source?: 'skill-assessment';
  targetSkill?: string;
  weaknesses?: string[];
}

const DEFAULT_FORM: SetupFormData = {
  company: 'Tech Corp',
  jobTitle: 'Senior Frontend Engineer',
  interviewerPersona:
    'Alex, a strict Engineering Manager who focuses on system design and edge cases.',
  jobDescription: '',
  resumeText: '',
  language: 'en-US',
  difficulty: 'medium',
  type: 'standard',
  mode: 'hybrid',
  companyStatus: 'Hiring for growth',
  interviewContext: 'Modern day video call',
  isPanel: false,
};

export const useSetupRoom = () => {
  const { startNewInterview, isLoading: isStarting } = useInterview();
  const location = useLocation();
  const navigationState = location.state as SkillAssessmentNavigationState | null;
  const [formData, setFormData] = useState<SetupFormData>(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryCompany = searchParams.get('company');
    const queryTitle = searchParams.get('title') || searchParams.get('jobTitle');
    if (queryCompany || queryTitle) {
      return {
        ...DEFAULT_FORM,
        ...(queryCompany ? { company: queryCompany, companyName: queryCompany } : {}),
        ...(queryTitle ? { jobTitle: queryTitle } : {}),
      };
    }
    if (navigationState?.source === 'skill-assessment') {
      const targetSkill = navigationState.targetSkill?.trim() || 'General';
      const weaknesses = navigationState.weaknesses || [];
      const weaknessContext =
        weaknesses.length > 0
          ? `\n\nTarget Areas / Focus Weaknesses to Drill:\n${weaknesses.map((w) => `- ${w}`).join('\n')}`
          : '';
      return {
        ...DEFAULT_FORM,
        jobTitle: `${targetSkill} Deep-Dive Interview`,
        jobDescription: `Deep-dive technical assessment into ${targetSkill}.${weaknessContext}`,
      };
    }
    return DEFAULT_FORM;
  });
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

  const loadData = useCallback(async () => {
    try {
      const resumes = await db.resumes.toArray();
      setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
      const jobs = await db.jobs.toArray();
      setSavedJobs(jobs.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      logger.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resumes = await db.resumes.toArray();
        const jobsList = await db.jobs.toArray();
        if (cancelled) return;
        setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
        setSavedJobs(jobsList.sort((a, b) => b.updatedAt - a.updatedAt));

        const searchParams = new URLSearchParams(location.search);
        const queryCompany = searchParams.get('company');
        const queryTitle = searchParams.get('title') || searchParams.get('jobTitle');
        if (queryCompany || queryTitle) {
          const matchedJob = jobsList.find(
            (j) =>
              (!queryCompany || j.company.toLowerCase() === queryCompany.toLowerCase()) &&
              (!queryTitle || j.jobTitle.toLowerCase() === queryTitle.toLowerCase())
          );
          if (matchedJob) {
            setFormData((prev) => ({
              ...prev,
              company: matchedJob.company,
              companyName: matchedJob.company,
              jobTitle: matchedJob.jobTitle,
              jobDescription: matchedJob.jobDescription || prev.jobDescription,
              interviewerPersona: matchedJob.interviewerPersona || prev.interviewerPersona,
              companyStatus: matchedJob.companyStatus || prev.companyStatus,
              interviewContext: matchedJob.interviewContext || prev.interviewContext,
            }));
          }
        }
      } catch (error) {
        logger.error('Failed to load data:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const jobs = useSetupJobs(formData, setFormData, loadData, savedJobs);
  const resumes = useSetupResumes(
    formData,
    setFormData,
    savedResumes,
    setSavedResumes,
    jobs.setIsJobModalOpen
  );
  const ai = useSetupAIActions(formData, setFormData, resumes.selectedResumeId);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleTogglePanel = useCallback(() => {
    setFormData((prev) => ({ ...prev, isPanel: !prev.isPanel }));
  }, []);

  const handleAutoFillFromRawJD = useCallback((parsed: ParsedJobData) => {
    const levelMap: Record<string, 'easy' | 'medium' | 'hard' | 'hardcore'> = {
      intern: 'easy',
      fresher: 'easy',
      junior: 'easy',
      mid: 'medium',
      senior: 'hard',
      lead: 'hardcore',
      manager: 'hardcore',
    };
    const mappedDifficulty = parsed.experienceLevel ? levelMap[parsed.experienceLevel] : undefined;

    setFormData((prev) => ({
      ...prev,
      company: parsed.company !== 'Target Company' ? parsed.company : prev.company,
      companyName:
        parsed.company !== 'Target Company' ? parsed.company : prev.companyName || prev.company,
      jobTitle: parsed.title || prev.jobTitle,
      jobDescription: parsed.description || prev.jobDescription,
      difficulty: mappedDifficulty || prev.difficulty,
      requirements: parsed.requirements.join(', '),
      experienceLevel: parsed.experienceLevel || prev.experienceLevel,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validation = validateInterviewSetup(formData);
      if (!validation.isValid) {
        toast.error(validation.errors[0]);
        return;
      }
      await startNewInterview(formData);
    },
    [formData, startNewInterview]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      await resumes.handleFileUpload(e);
      ai.setResumeAnalysis(null);
    },
    [resumes, ai]
  );

  const applyPreset = useCallback((preset: Partial<SetupFormData>) => {
    setFormData((prev) => ({ ...prev, ...preset }));
  }, []);

  return {
    state: {
      isParsing: resumes.isParsing,
      isExtracting: ai.isExtracting,
      isAnalyzing: ai.isAnalyzing,
      isResearching: ai.isResearching,
      isStarting,
      savedResumes,
      selectedResumeId: resumes.selectedResumeId,
      resumeAnalysis: ai.resumeAnalysis,
      savedJobs,
      selectedJobId: jobs.selectedJobId,
      isJobModalOpen: jobs.isJobModalOpen,
      isTailorModalOpen: resumes.isTailorModalOpen,
      resumeToTailor: resumes.resumeToTailor,
      showMainCVCloneDialog: resumes.showMainCVCloneDialog,
      pendingMainResume: resumes.pendingMainResume,
      isCloning: resumes.isCloning,
      formData,
    },
    actions: {
      handleChange,
      handleSubmit,
      applyPreset,
      handleResumeSelect: resumes.handleResumeSelect,
      handleSaveJob: jobs.handleSaveJob,
      handleDeleteJob: jobs.handleDeleteJob,
      handleSelectSavedJob: jobs.handleSelectSavedJob,
      handleConfirmClone: resumes.handleConfirmClone,
      handleDeleteResume: resumes.handleDeleteResume,
      handleToggleMain: resumes.handleToggleMain,
      handleTailorClick: resumes.handleTailorClick,
      handleGenerateTailoredResume: resumes.handleGenerateTailoredResume,
      handleAutoFill: ai.handleAutoFill,
      handleResearchCompany: ai.handleResearchCompany,
      handleFileUpload,
      handleAnalyzeResume: ai.handleAnalyzeResume,
      handleSelectJob: resumes.handleSelectJob,
      setShowMainCVCloneDialog: resumes.setShowMainCVCloneDialog,
      setIsTailorModalOpen: resumes.setIsTailorModalOpen,
      setIsJobModalOpen: jobs.setIsJobModalOpen,
      loadData,
      handleTogglePanel,
      handleAutoFillFromRawJD,
    },
  };
};
