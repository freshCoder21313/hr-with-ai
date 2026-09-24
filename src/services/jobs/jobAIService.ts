import { UserSettings, JobRecommendation } from '@/types';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { getExtractJDInfoPrompt } from '@/services/prompts';
import { generateJobRecommendationsPrompt, generateTailoredResumePrompt } from './jobPromptSystem';
import { ResumeData } from '@/types/resume';
import { DBJobRecommendation } from './jobRecommendationService';
import { getService, AIConfigInput, getStoredAIConfig } from '@/services/ai/aiConfigService';
import { jdExtractSchema, jobRecommendationsSchema, resumeDataSchema } from '@/services/ai/schemas';

export const extractInfoFromJD = async (
  jobDescription: string,
  configInput: AIConfigInput
): Promise<{
  company: string;
  jobTitle: string;
  interviewerPersona: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'hardcore';
  companyStatus?: string;
  interviewContext?: string;
}> => {
  const service = await getService(configInput);
  const prompt = getExtractJDInfoPrompt(jobDescription);

  try {
    return await service.generateStructured([{ role: 'user', content: prompt }], jdExtractSchema);
  } catch (error) {
    logger.error('Error extracting info from JD:', error);
    throw error;
  }
};

export const generateJobRecommendations = async (
  resumeData: ResumeData,
  language: string,
  _config: UserSettings,
  resumeId?: number
): Promise<JobRecommendation[]> => {
  const aiConfig = getStoredAIConfig();
  const service = await getService(aiConfig);

  if (resumeId) {
    try {
      const cachedJobs = await db.job_recommendations.where('resumeId').equals(resumeId).toArray();

      if (cachedJobs && cachedJobs.length > 0) {
        return cachedJobs.map((job) => ({
          id: `job-${job.createdAt}-${job.id}`,
          title: job.title,
          company: job.company,
          industry: job.industry || '',
          location: job.location || '',
          salaryRange: job.salaryRange || '',
          keyRequirements: JSON.parse(job.keyRequirements || '[]') as string[],
          whyItFits: job.whyItFits || '',
          matchScore: job.matchScore || 0,
          jobDescription: job.jobDescription || '',
          tailoredResumeId: job.tailoredResumeId,
        }));
      }
    } catch {
      // Cache check failed, will fetch fresh data
    }
  }

  const prompt = generateJobRecommendationsPrompt(resumeData, language);

  try {
    const recommendations = await service.generateStructured(
      [{ role: 'user', content: prompt }],
      jobRecommendationsSchema
    );

    const mappedRecommendations: JobRecommendation[] = recommendations.map((job, index) => ({
      id: `job-${Date.now()}-${index}`,
      title: job.title,
      company: job.company,
      industry: job.industry || '',
      location: job.location || '',
      salaryRange: job.salaryRange || '',
      keyRequirements: job.keyRequirements || [],
      whyItFits: job.whyItFits || '',
      matchScore: job.matchScore || 0,
      jobDescription: job.jobDescription || '',
    }));

    if (resumeId) {
      db.transaction('rw', db.job_recommendations, async () => {
        await db.job_recommendations.where('resumeId').equals(resumeId).delete();
        const dbJobs: Omit<DBJobRecommendation, 'id'>[] = mappedRecommendations.map((job) => ({
          interviewId: 0,
          resumeId,
          title: job.title,
          company: job.company,
          industry: job.industry,
          location: job.location,
          salaryRange: job.salaryRange,
          keyRequirements: JSON.stringify(job.keyRequirements || []),
          whyItFits: job.whyItFits,
          matchScore: job.matchScore,
          jobDescription: job.jobDescription,
          tailoredResumeId: job.tailoredResumeId,
          createdAt: Date.now(),
        }));
        await db.job_recommendations.bulkAdd(dbJobs);
      }).catch(() => {
        // Cache write failed, non-critical
      });
    }

    return mappedRecommendations;
  } catch (error) {
    logger.error('Error generating job recommendations:', error);
    throw error;
  }
};

export const generateTailoredResumeForJob = async (
  originalResumeData: ResumeData,
  jobDescription: string,
  _config: UserSettings
): Promise<ResumeData> => {
  const aiConfig = getStoredAIConfig();
  const service = await getService(aiConfig);
  const prompt = generateTailoredResumePrompt(originalResumeData, jobDescription);

  try {
    return (await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeDataSchema
    )) as unknown as ResumeData;
  } catch (error) {
    logger.error('Error generating tailored resume:', error);
    throw error;
  }
};
