import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Resume, JobRecommendation } from '@/types';
import { ResumeData } from '@/types/resume';
import {
  generateJobRecommendations,
  generateTailoredResumeForJob,
} from '@/services/jobs/jobAIService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';

export type JobRecStep = 'select-resume' | 'analyzing' | 'results' | 'completed';

function tailoredDataToText(job: JobRecommendation, tailoredData: ResumeData): string {
  let tailoredText = `Tailored Resume for ${job.title} @ ${job.company}\n\n`;

  if (tailoredData.basics?.summary) {
    tailoredText += `Professional Summary:\n${tailoredData.basics.summary}\n\n`;
  }
  if (tailoredData.skills?.length) {
    tailoredText += `Skills: ${tailoredData.skills.map((s) => s.name).join(', ')}\n\n`;
  }
  if (tailoredData.work?.length) {
    tailoredText += `Experience:\n${tailoredData.work
      .map((w) => {
        const dateStr = w.startDate ? ` (${w.startDate} - ${w.endDate || 'Present'})` : '';
        return `- ${w.position} at ${w.name}${dateStr}\n  ${w.summary || ''}`;
      })
      .join('\n')}\n\n`;
  }
  if (tailoredData.education?.length) {
    tailoredText += `Education:\n${tailoredData.education
      .map((e) => `- ${e.studyType} in ${e.area} at ${e.institution}`)
      .join('\n')}\n\n`;
  }
  if (tailoredData.projects?.length) {
    tailoredText += `Projects:\n${tailoredData.projects
      .map((p) => `- ${p.name}: ${p.description || ''}`)
      .join('\n')}`;
  }
  return tailoredText;
}

interface UseJobRecommendationFlowOptions {
  isOpen: boolean;
  existingResumeId?: number;
  availableResumes: Resume[];
  onSelectJob: (
    job: JobRecommendation,
    tailoredResumeText: string,
    tailoredResumeData?: ResumeData
  ) => void;
  onClose: () => void;
}

export function useJobRecommendationFlow({
  isOpen,
  existingResumeId,
  availableResumes,
  onSelectJob,
  onClose,
}: UseJobRecommendationFlowOptions) {
  const [step, setStep] = useState<JobRecStep>('select-resume');
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && existingResumeId && availableResumes.length > 0) {
      const resume = availableResumes.find((r) => r.id === existingResumeId);
      if (resume) setSelectedResume(resume);
    }
  }, [isOpen, existingResumeId, availableResumes]);

  const handleGenerateJobs = useCallback(async () => {
    if (!selectedResume?.parsedData) {
      setError('Please select a resume with parsed data');
      return;
    }

    setStep('analyzing');
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const config = getStoredAIConfig();
      if (!config.apiKey) throw new Error('Please configure your API key in settings');

      const generatedJobs = await generateJobRecommendations(
        selectedResume.parsedData,
        'en-US',
        config,
        selectedResume.id
      );

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setJobs(generatedJobs);
        setStep('results');
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      logger.error('Error generating jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate job recommendations');
      setIsGenerating(false);
      setStep('select-resume');
    }
  }, [selectedResume]);

  const handleSelectJob = useCallback(
    async (job: JobRecommendation) => {
      setSelectedJob(job);
      setStep('completed');

      try {
        if (!selectedResume?.parsedData) throw new Error('No resume selected');

        const config = getStoredAIConfig();
        const tailoredData = await generateTailoredResumeForJob(
          selectedResume.parsedData,
          job.jobDescription,
          config
        );
        const tailoredText = tailoredDataToText(job, tailoredData);

        setTimeout(() => {
          onSelectJob(job, tailoredText, tailoredData);
          onClose();
        }, 2000);
      } catch (err) {
        logger.error('Error generating tailored resume:', err);
        setError('Failed to generate tailored resume. Please try selecting another job.');
        setStep('results');
      }
    },
    [selectedResume, onSelectJob, onClose]
  );

  return {
    step,
    setStep,
    selectedResume,
    setSelectedResume,
    jobs,
    selectedJob,
    isGenerating,
    progress,
    error,
    handleGenerateJobs,
    handleSelectJob,
  };
}
