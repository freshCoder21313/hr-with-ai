import { useState, useCallback } from 'react';
import { SetupFormData, SavedJob } from '@/types';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { notificationService } from '@/services/core/notificationService';
import { isNonEmptyString } from '@/lib/validation';

export function useSetupJobs(
  formData: SetupFormData,
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>,
  loadData: () => Promise<void>,
  savedJobs: SavedJob[]
) {
  const [selectedJobId, setSelectedJobId] = useState<string>('new');
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const handleSaveJob = useCallback(async () => {
    if (!isNonEmptyString(formData.jobTitle) || !isNonEmptyString(formData.company)) {
      toast.error('Please enter at least a Job Title and Company.');
      return;
    }
    try {
      const timestamp = Date.now();
      const baseJobData = {
        company: formData.company,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        interviewerPersona: formData.interviewerPersona,
        companyStatus: formData.companyStatus,
        interviewContext: formData.interviewContext,
        updatedAt: timestamp,
      };
      if (selectedJobId !== 'new') {
        await db.jobs.update(parseInt(selectedJobId, 10), baseJobData);
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

  const handleDeleteJob = useCallback(
    async (e: React.MouseEvent, id: number) => {
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
    },
    [selectedJobId, loadData]
  );

  const handleSelectSavedJob = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedJobId(val);
      if (val === 'new') return;
      const job = savedJobs.find((j) => j.id?.toString() === val);
      if (job) {
        setFormData((prev) => ({
          ...prev,
          company: job.company,
          jobTitle: job.jobTitle,
          jobDescription: job.jobDescription,
          interviewerPersona: job.interviewerPersona,
          companyStatus: job.companyStatus || prev.companyStatus,
          interviewContext: job.interviewContext || prev.interviewContext,
        }));
      }
    },
    [savedJobs, setFormData]
  );

  return {
    selectedJobId,
    setSelectedJobId,
    isJobModalOpen,
    setIsJobModalOpen,
    handleSaveJob,
    handleDeleteJob,
    handleSelectSavedJob,
  };
}
