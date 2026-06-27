import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetupFormData, Resume, ResumeAnalysis, SavedJob } from '@/types';
import { ResumeData } from '@/types/resume';
import { parseResume } from '@/services/resume/resumeParser';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { analyzeResume, tailorResumeToJob, parseResumeToJSON } from '@/services/resume/resumeAIService';
import { extractInfoFromJD } from '@/services/jobs/jobAIService';
import { researchCompany } from '@/services/ai/aiResearcherService';
import { useInterview } from '@/hooks/useInterview';
import { db } from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { notificationService } from '@/services/core/notificationService';
import { isNonEmptyString, validateInterviewSetup } from '@/lib/validation';

export const useSetupRoom = () => {
  const { startNewInterview, isLoading: isStarting } = useInterview();
  const navigate = useNavigate();
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number>();
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('new');

  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [resumeToTailor, setResumeToTailor] = useState<Resume | null>(null);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const [showMainCVCloneDialog, setShowMainCVCloneDialog] = useState(false);
  const [pendingMainResume, setPendingMainResume] = useState<Resume | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const [formData, setFormData] = useState<SetupFormData>({
    company: 'Tech Corp',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona: 'Alex, a strict Engineering Manager who focuses on system design and edge cases.',
    jobDescription: '',
    resumeText: '',
    language: 'en-US',
    difficulty: 'medium',
    type: 'standard',
    mode: 'hybrid',
    companyStatus: 'Hiring for growth',
    interviewContext: 'Modern day video call',
    isPanel: false,
  });

  const loadData = useCallback(async () => {
    try {
      const resumes = await db.resumes.toArray();
      setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
      const jobs = await db.jobs.toArray();
      setSavedJobs(jobs.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleResumeSelect = useCallback((resume: Resume) => {
    if (selectedResumeId === resume.id) {
      setSelectedResumeId(undefined);
      setFormData((prev) => ({ ...prev, resumeText: '' }));
    } else {
      if (resume.isMain) {
        setPendingMainResume(resume);
        setShowMainCVCloneDialog(true);
        return;
      }
      setSelectedResumeId(resume.id);
      setFormData((prev) => ({ ...prev, resumeText: resume.rawText }));
    }
  }, [selectedResumeId]);

  const handleSaveJob = useCallback(async () => {
    if (!isNonEmptyString(formData.jobTitle) || !isNonEmptyString(formData.company)) {
      toast.error('Please enter at least a Job Title and Company.');
      return;
    }
    try {
      const timestamp = Date.now();
      const baseJobData = {
        company: formData.company, jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription, interviewerPersona: formData.interviewerPersona,
        companyStatus: formData.companyStatus, interviewContext: formData.interviewContext,
        updatedAt: timestamp,
      };
      if (selectedJobId !== 'new') {
        await db.jobs.update(parseInt(selectedJobId), baseJobData);
        toast.success('Job updated successfully!');
      } else {
        const newJob: SavedJob = { ...baseJobData, createdAt: timestamp };
        const newId = await db.jobs.add(newJob);
        toast.success('Job saved successfully!');
        await loadData();
        setSelectedJobId(newId.toString());
        return;
      }
      loadData();
    } catch (error) {
      console.error('Failed to save job:', error);
      toast.error('Failed to save job');
    }
  }, [formData, selectedJobId, loadData]);

  const handleDeleteJob = useCallback(async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = await notificationService.confirm({
      title: 'Delete Job Template',
      message: 'Are you sure you want to delete this saved job template?',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await db.jobs.delete(id);
      if (selectedJobId === id.toString()) setSelectedJobId('new');
      loadData();
      toast.success('Job deleted successfully');
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    }
  }, [selectedJobId, loadData]);

  const handleSelectSavedJob = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJobId(val);
    if (val === 'new') return;
    const job = savedJobs.find((j) => j.id?.toString() === val);
    if (job) {
      setFormData((prev) => ({
        ...prev, company: job.company, jobTitle: job.jobTitle,
        jobDescription: job.jobDescription, interviewerPersona: job.interviewerPersona,
        companyStatus: job.companyStatus || prev.companyStatus,
        interviewContext: job.interviewContext || prev.interviewContext,
      }));
    }
  }, [savedJobs]);

  const handleConfirmClone = useCallback(async (shouldClone: boolean) => {
    if (!pendingMainResume) return;
    if (shouldClone) {
      setIsCloning(true);
      try {
        const copyName = `[Copy] ${pendingMainResume.fileName}`;
        const newResume: Resume = {
          ...pendingMainResume, id: undefined,
          fileName: copyName, createdAt: Date.now(), updatedAt: Date.now(), isMain: false,
        };
        const newId = await db.resumes.add(newResume);
        const savedResume = { ...newResume, id: newId };
        setSavedResumes((prev) => [savedResume, ...prev]);
        setSelectedResumeId(newId);
        setFormData((prev) => ({ ...prev, resumeText: savedResume.rawText }));
      } catch (error) {
        console.error('Failed to clone resume:', error);
        toast.error('Failed to clone resume');
        setSelectedResumeId(pendingMainResume.id);
        setFormData((prev) => ({ ...prev, resumeText: pendingMainResume.rawText }));
      } finally {
        setIsCloning(false);
      }
    } else {
      setSelectedResumeId(pendingMainResume.id);
      setFormData((prev) => ({ ...prev, resumeText: pendingMainResume.rawText }));
    }
    setShowMainCVCloneDialog(false);
    setPendingMainResume(null);
  }, [pendingMainResume]);

  const handleDeleteResume = useCallback(async (id: number) => {
    const confirmed = await notificationService.confirm({
      title: 'Delete Resume',
      message: 'Are you sure you want to delete this resume?',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await db.resumes.delete(id);
      setSavedResumes((prev) => prev.filter((r) => r.id !== id));
      if (selectedResumeId === id) {
        setSelectedResumeId(undefined);
        setFormData((prev) => ({ ...prev, resumeText: '' }));
      }
      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error('Failed to delete resume:', error);
      toast.error('Failed to delete resume');
    }
  }, [selectedResumeId]);

  const handleToggleMain = useCallback(async (resume: Resume) => {
    if (!resume.id) return;
    try {
      await db.setMainCV(resume.id);
      const updated = await db.resumes.toArray();
      setSavedResumes(updated.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to set main CV:', error);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateInterviewSetup(formData);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    await startNewInterview(formData);
  }, [formData, startNewInterview]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleTailorClick = useCallback((resume: Resume) => {
    setResumeToTailor(resume);
    setIsTailorModalOpen(true);
  }, []);

  const handleGenerateTailoredResume = useCallback(async (jobDescription: string) => {
    if (!resumeToTailor) return;
    const config = getStoredAIConfig();
    if (!config.apiKey) { toast.error('Please set your API Key first.'); return; }
    try {
      let sourceData = resumeToTailor.parsedData;
      if (!sourceData) {
        sourceData = await parseResumeToJSON(resumeToTailor.rawText, config);
      }
      const tailoredData = await tailorResumeToJob(sourceData, jobDescription, config);
      const newFileName = `${resumeToTailor.fileName.replace(/\.pdf|\.txt/i, '')} - Tailored.pdf`;
      const newResume: Resume = {
        createdAt: Date.now(), fileName: newFileName,
        rawText: resumeToTailor.rawText, parsedData: tailoredData, formatted: true,
      };
      const newId = await db.resumes.add(newResume);
      navigate(`/resumes/${newId}/edit`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to tailor resume: ' + getErrorMessage(error));
    }
  }, [resumeToTailor, navigate]);

  const handleAutoFill = useCallback(async () => {
    if (!isNonEmptyString(formData.jobDescription)) {
      toast.error('Please enter a Job Description first.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) { toast.error('Please set your API Key first.'); return; }
    setIsExtracting(true);
    try {
      const extracted = await extractInfoFromJD(formData.jobDescription, config);
      setFormData((prev) => ({
        ...prev, company: extracted.company, jobTitle: extracted.jobTitle,
        interviewerPersona: extracted.interviewerPersona,
        difficulty: extracted.difficulty || prev.difficulty,
        companyStatus: extracted.companyStatus || prev.companyStatus,
        interviewContext: extracted.interviewContext || prev.interviewContext,
      }));
    } catch (error) {
      toast.error('Failed to extract info: ' + getErrorMessage(error));
    } finally {
      setIsExtracting(false);
    }
  }, [formData.jobDescription]);

  const handleTogglePanel = useCallback(() => {
    setFormData((prev) => ({ ...prev, isPanel: !prev.isPanel }));
  }, []);

  const handleResearchCompany = useCallback(async () => {
    if (!isNonEmptyString(formData.company)) {
      toast.error('Please enter a Company name first.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) { toast.error('Please set your API Key first.'); return; }
    setIsResearching(true);
    try {
      const intel = await researchCompany(formData.company);
      setFormData((prev) => ({
        ...prev, companyStatus: intel.suggestedStatus || prev.companyStatus,
        interviewContext: `${intel.suggestedContext || prev.interviewContext}\n\nCulture: ${intel.culture}\nLatest News: ${intel.latestNews}`,
      }));
      toast.success(`Research for ${formData.company} complete! Form updated.`);
    } catch (error) {
      toast.error('Failed to research company: ' + getErrorMessage(error));
    } finally {
      setIsResearching(false);
    }
  }, [formData.company]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    try {
      const text = await parseResume(file);
      const newResume: Resume = { createdAt: Date.now(), fileName: file.name, rawText: text };
      const id = await db.resumes.add(newResume);
      const savedResume = { ...newResume, id };
      setSavedResumes((prev) => [savedResume, ...prev]);
      setSelectedResumeId(id);
      setFormData((prev) => ({ ...prev, resumeText: text }));
      setResumeAnalysis(null);
    } catch (error) {
      toast.error('Failed to parse resume: ' + getErrorMessage(error));
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  }, []);

  const handleAnalyzeResume = useCallback(async () => {
    if (!formData.resumeText || !formData.jobDescription) {
      toast.error('Please provide both Resume content and Job Description.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) { toast.error('Please set your API Key first.'); return; }
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeResume(formData.resumeText, formData.jobDescription, config, selectedResumeId);
      setResumeAnalysis(analysis);
    } catch (error) {
      toast.error('Analysis failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAnalyzing(false);
    }
  }, [formData.resumeText, formData.jobDescription, selectedResumeId]);

  const handleSelectJob = useCallback(async (
    job: import('@/types').JobRecommendation,
    tailoredResumeText: string,
    tailoredResumeData?: ResumeData
  ) => {
    setFormData((prev) => ({
      ...prev, company: job.company, jobTitle: job.title,
      jobDescription: job.jobDescription, resumeText: tailoredResumeText || prev.resumeText,
    }));
    if (tailoredResumeText && tailoredResumeData) {
      try {
        const newResume: Resume = {
          createdAt: Date.now(), fileName: `[Tailored] ${job.title} @ ${job.company}.pdf`,
          rawText: tailoredResumeText, parsedData: tailoredResumeData, formatted: true, isMain: false,
        };
        const newId = await db.resumes.add(newResume);
        setSavedResumes((prev) => [{ ...newResume, id: newId }, ...prev]);
        setSelectedResumeId(newId);
      } catch (e) { console.error('Failed to save tailored resume:', e); }
    }
    setIsJobModalOpen(false);
  }, []);

  return {
    state: {
      isParsing, isExtracting, isAnalyzing, isResearching, isStarting,
      savedResumes, selectedResumeId, resumeAnalysis,
      savedJobs, selectedJobId, isJobModalOpen,
      isTailorModalOpen, resumeToTailor,
      showMainCVCloneDialog, pendingMainResume, isCloning,
      formData,
    },
    actions: {
      handleChange, handleSubmit, handleResumeSelect,
      handleSaveJob, handleDeleteJob, handleSelectSavedJob, handleConfirmClone,
      handleDeleteResume, handleToggleMain, handleTailorClick,
      handleGenerateTailoredResume, handleAutoFill, handleResearchCompany,
      handleFileUpload, handleAnalyzeResume, handleSelectJob,
      setShowMainCVCloneDialog, setIsTailorModalOpen, setIsJobModalOpen,
      loadData, handleTogglePanel,
    },
  };
};