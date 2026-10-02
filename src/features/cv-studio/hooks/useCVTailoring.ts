import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { tailorResumeV2, parseResumeToJSON, analyzeResume } from '@/services/resume/resumeAIService';
import { getTailoredResumePrompt } from '@/services/prompts';
import { assertTailorFaithful, filterFaithfulResume } from '@/services/resume/tailorGuard';
import { Job } from '../stores/useJobStore';

export type JobProcessStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface JobWithStatus extends Job {
  status: JobProcessStatus;
  resultId?: number;
  error?: string;
}

const TAILOR_BATCH_SIZE = 3;

interface UseCVTailoringOptions {
  jobs: Job[];
  globalPrompt: string;
  onResumesUpdated: (resumes: Resume[]) => void;
}

export const useCVTailoring = ({ jobs, globalPrompt, onResumesUpdated }: UseCVTailoringOptions) => {
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [processingStatus, setProcessingStatus] = useState<Record<string, Partial<JobWithStatus>>>(
    {}
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleToggleJobSelection = useCallback((jobId: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);
  // Re-tailoring is a state transition, not a reset: the previously generated
  // resume row is left in place and only this job's card returns to idle.
  const handleReTailorJob = useCallback((jobId: string) => {
    setProcessingStatus((prev) => {
      if (!prev[jobId]) return prev;
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
    setSelectedJobs((prev) => (prev.has(jobId) ? prev : new Set(prev).add(jobId)));
  }, []);

  const refreshResumes = useCallback(async () => {
    try {
      const all = await db.resumes.toArray();
      onResumesUpdated(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      logger.error('Failed to refresh CV list after tailoring', err);
      toast.error('Could not refresh the CV list. Please try again.');
    }
  }, [onResumesUpdated]);

  const handleStartTailoring = useCallback(
    async (resumes: Resume[]) => {
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

      const parsedSourceData: ResumeData = sourceData;
      let completed = 0;

      for (let i = 0; i < jobsToProcess.length; i += TAILOR_BATCH_SIZE) {
        const batch = jobsToProcess.slice(i, i + TAILOR_BATCH_SIZE);

        batch.forEach((job) => {
          setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'processing' } }));
        });

        await Promise.all(
          batch.map(async (job) => {
            try {
              const analysis = await analyzeResume(
                sourceResume.rawText,
                job.description,
                config,
                sourceResume.id
              ).catch(() => null);
              const extra = [globalPrompt, job.customPrompt].filter(Boolean).join('\n\n') || undefined;
              const prompt = getTailoredResumePrompt(
                parsedSourceData,
                job.description,
                analysis?.missingKeywords,
                extra
              );
              const tailored = await tailorResumeV2(config, prompt);
              const { valid, issues } = assertTailorFaithful(parsedSourceData, tailored);
              if (!valid) {
                logger.warn('tailor guard rejected fabricated entries', { jobId: job.id, issues });
              }
              const safe = valid ? tailored : filterFaithfulResume(parsedSourceData, tailored);
              safe.meta = {
                ...(safe.meta || {}),
                tailoredFromResumeId: sourceResume.id,
                tailoredForJobId: job.id,
                tailoredForJobCompany: job.company,
                tailoredForJobTitle: job.title,
              };
              const newId = await db.resumes.add({
                createdAt: Date.now(),
                fileName: `[${job.company}] ${job.title} - ${sourceResume.fileName}`,
                rawText: JSON.stringify(safe, null, 2),
                parsedData: safe,
                formatted: true,
                isMain: false,
              });
              setProcessingStatus((prev) => ({
                ...prev,
                [job.id]: { status: 'completed', resultId: newId },
              }));
            } catch {
              setProcessingStatus((prev) => ({
                ...prev,
                [job.id]: { status: 'error', error: 'Failed.' },
              }));
            } finally {
              completed += 1;
              setProgress(Math.round((completed / jobsToProcess.length) * 100));
            }
          })
        );
      }

      // Always reset, even if the refresh throws, or the panel sticks on "Tailoring...".
      try {
        await refreshResumes();
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedResumeId, selectedJobs, jobs, globalPrompt, refreshResumes]
  );

  return {
    selectedResumeId,
    setSelectedResumeId,
    selectedJobs,
    processingStatus,
    isProcessing,
    progress,
    handleToggleJobSelection,
    handleStartTailoring,
    handleReTailorJob,
  };
};
