import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetupFormData, Resume, JobRecommendation } from '@/types';
import { ResumeData } from '@/types/resume';
import { parseResume } from '@/services/resume/resumeParser';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { tailorResumeToJob, parseResumeToJSON } from '@/services/resume/resumeAIService';
import { db } from '@/lib/db';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { notificationService } from '@/services/core/notificationService';

export function useSetupResumes(
  formData: SetupFormData,
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>,
  savedResumes: Resume[],
  setSavedResumes: React.Dispatch<React.SetStateAction<Resume[]>>,
  setIsJobModalOpen: (open: boolean) => void
) {
  const navigate = useNavigate();
  const [isParsing, setIsParsing] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<number>();
  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [resumeToTailor, setResumeToTailor] = useState<Resume | null>(null);
  const [showMainCVCloneDialog, setShowMainCVCloneDialog] = useState(false);
  const [pendingMainResume, setPendingMainResume] = useState<Resume | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const handleResumeSelect = useCallback(
    (resume: Resume) => {
      if (selectedResumeId === resume.id) {
        setSelectedResumeId(undefined);
        setFormData((prev) => ({ ...prev, resumeText: '' }));
      } else if (resume.isMain) {
        setPendingMainResume(resume);
        setShowMainCVCloneDialog(true);
      } else {
        setSelectedResumeId(resume.id);
        setFormData((prev) => ({ ...prev, resumeText: resume.rawText }));
      }
    },
    [selectedResumeId, setFormData]
  );

  const handleConfirmClone = useCallback(
    async (shouldClone: boolean) => {
      if (!pendingMainResume) return;
      if (shouldClone) {
        setIsCloning(true);
        try {
          const copyName = `[Copy] ${pendingMainResume.fileName}`;
          const newResume: Resume = {
            ...pendingMainResume,
            id: undefined,
            fileName: copyName,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isMain: false,
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
    },
    [pendingMainResume, setFormData, setSavedResumes]
  );

  const handleDeleteResume = useCallback(
    async (id: number) => {
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
    },
    [selectedResumeId, setFormData, setSavedResumes]
  );

  const handleToggleMain = useCallback(
    async (resume: Resume) => {
      if (!resume.id) return;
      try {
        await db.setMainCV(resume.id);
        const updated = await db.resumes.toArray();
        setSavedResumes(updated.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error('Failed to set main CV:', error);
      }
    },
    [setSavedResumes]
  );

  const handleTailorClick = useCallback((resume: Resume) => {
    setResumeToTailor(resume);
    setIsTailorModalOpen(true);
  }, []);

  const handleGenerateTailoredResume = useCallback(
    async (jobDescription: string) => {
      if (!resumeToTailor) return;
      const config = getStoredAIConfig();
      if (!config.apiKey) {
        toast.error('Please set your API Key first.');
        return;
      }
      try {
        let sourceData = resumeToTailor.parsedData;
        if (!sourceData) {
          sourceData = await parseResumeToJSON(resumeToTailor.rawText, config);
        }
        const tailoredData = await tailorResumeToJob(sourceData, jobDescription, config);
        const newFileName = `${resumeToTailor.fileName.replace(/\.pdf|\.txt/i, '')} - Tailored.pdf`;
        const newResume: Resume = {
          createdAt: Date.now(),
          fileName: newFileName,
          rawText: resumeToTailor.rawText,
          parsedData: tailoredData,
          formatted: true,
        };
        const newId = await db.resumes.add(newResume);
        navigate(`/resumes/${newId}/edit`);
      } catch (error) {
        console.error(error);
        toast.error('Failed to tailor resume: ' + getErrorMessage(error));
      }
    },
    [resumeToTailor, navigate]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch (error) {
        toast.error('Failed to parse resume: ' + getErrorMessage(error));
      } finally {
        setIsParsing(false);
        e.target.value = '';
      }
    },
    [setFormData, setSavedResumes]
  );

  const handleSelectJob = useCallback(
    async (job: JobRecommendation, tailoredResumeText: string, tailoredResumeData?: ResumeData) => {
      setFormData((prev) => ({
        ...prev,
        company: job.company,
        jobTitle: job.title,
        jobDescription: job.jobDescription,
        resumeText: tailoredResumeText || prev.resumeText,
      }));
      if (tailoredResumeText && tailoredResumeData) {
        try {
          const newResume: Resume = {
            createdAt: Date.now(),
            fileName: `[Tailored] ${job.title} @ ${job.company}.pdf`,
            rawText: tailoredResumeText,
            parsedData: tailoredResumeData,
            formatted: true,
            isMain: false,
          };
          const newId = await db.resumes.add(newResume);
          setSavedResumes((prev) => [{ ...newResume, id: newId }, ...prev]);
          setSelectedResumeId(newId);
        } catch (e) {
          console.error('Failed to save tailored resume:', e);
        }
      }
      setIsJobModalOpen(false);
    },
    [setFormData, setSavedResumes, setIsJobModalOpen]
  );

  return {
    isParsing,
    selectedResumeId,
    isTailorModalOpen,
    setIsTailorModalOpen,
    resumeToTailor,
    showMainCVCloneDialog,
    setShowMainCVCloneDialog,
    pendingMainResume,
    isCloning,
    handleResumeSelect,
    handleConfirmClone,
    handleDeleteResume,
    handleToggleMain,
    handleTailorClick,
    handleGenerateTailoredResume,
    handleFileUpload,
    handleSelectJob,
  };
}
