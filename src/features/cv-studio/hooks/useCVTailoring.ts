import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { tailorResumeV2, parseResumeToJSON } from '@/services/resume/resumeAIService';
import { ROOT_PROMPT } from '@/services/ai/rootPrompt';
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
  const [processingStatus, setProcessingStatus] = useState<Record<string, Partial<JobWithStatus>>>({});
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

  const refreshResumes = useCallback(async () => {
    const all = await db.resumes.toArray();
    onResumesUpdated(all.sort((a, b) => b.createdAt - a.createdAt));
  }, [onResumesUpdated]);

  const handleStartTailoring = useCallback(async (resumes: Resume[]) => {
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
            const finalPrompt = `${ROOT_PROMPT}\n\nYou are an expert Resume Strategist.\n${globalPrompt}${job.customPrompt ? `\n\n--- Job-Specific ---\n${job.customPrompt}` : ''}\n\nSOURCE RESUME:\n${JSON.stringify(parsedSourceData, null, 2)}\n\nTARGET JD:\n${job.description}\n\nReturn valid JSON only, no markdown.`;
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
          } finally {
            completed += 1;
            setProgress(Math.round((completed / jobsToProcess.length) * 100));
          }
        })
      );
    }

    await refreshResumes();
    setIsProcessing(false);
  }, [selectedResumeId, selectedJobs, jobs, globalPrompt, refreshResumes]);

  return {
    selectedResumeId,
    setSelectedResumeId,
    selectedJobs,
    processingStatus,
    isProcessing,
    progress,
    handleToggleJobSelection,
    handleStartTailoring,
  };
};