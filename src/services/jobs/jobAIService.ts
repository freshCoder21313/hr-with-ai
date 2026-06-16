import { Type } from '@google/genai';
import { UserSettings, JobRecommendation } from '@/types';
import { db } from '@/lib/db';
import { getExtractJDInfoPrompt } from '@/services/interview/promptSystem';
import { generateJobRecommendationsPrompt, generateTailoredResumePrompt } from './jobPromptSystem';
import { ResumeData } from '@/types/resume';
import { DBJobRecommendation } from './jobRecommendationService';
import {
  getService,
  resolveConfig,
  AIConfigInput,
  getStoredAIConfig,
} from '@/services/ai/aiConfigService';
import { cleanJsonString } from '@/services/ai/aiUtils';
import { getArrayAIResponseOptions } from '@/lib/aiResponseHelper';

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
    const response = await service.generateText([{ role: 'user', content: prompt }]);
    const jsonText = response.text || '';

    if (!jsonText) throw new Error('No information extracted');

    return JSON.parse(cleanJsonString(jsonText));
  } catch (error) {
    console.error('Error extracting info from JD:', error);
    throw error;
  }
};

// Generate job recommendations from resume data
export const generateJobRecommendations = async (
  resumeData: ResumeData,
  language: string,
  _config: UserSettings,
  resumeId?: number
  ): Promise<JobRecommendation[]> => {
  const aiConfig = getStoredAIConfig();
  const config = resolveConfig(aiConfig);
  const service = await getService(aiConfig);

  // Check Cache
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
    const responseOptions = getArrayAIResponseOptions(
      config,
      {
        title: { type: Type.STRING },
        company: { type: Type.STRING },
        industry: { type: Type.STRING },
        location: { type: Type.STRING },
        salaryRange: { type: Type.STRING },
        keyRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
        whyItFits: { type: Type.STRING },
        matchScore: { type: Type.NUMBER },
        jobDescription: { type: Type.STRING },
      },
      [
        'title',
        'company',
        'industry',
        'location',
        'salaryRange',
        'keyRequirements',
        'whyItFits',
        'matchScore',
        'jobDescription',
      ]
    );

    let jsonText = '';
    const response = await service.generateText(
      [{ role: 'user', content: prompt }],
      responseOptions
    );
    jsonText = response.text;

    if (!jsonText) throw new Error('No job recommendations generated');

    const recommendations = JSON.parse(cleanJsonString(jsonText));

    const mappedRecommendations: JobRecommendation[] = recommendations.map(
      (job: JobRecommendation, index: number) => ({
        ...job,
        id: `job-${Date.now()}-${index}`,
      })
    );

    // Cache Results
    if (resumeId) {
      db.transaction('rw', db.job_recommendations, async () => {
        await db.job_recommendations.where('resumeId').equals(resumeId).delete();
        const dbJobs: Omit<DBJobRecommendation, 'id'>[] = mappedRecommendations.map(
          (job: JobRecommendation) => ({
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
          })
        );
        await db.job_recommendations.bulkAdd(dbJobs);
      }).catch(() => {
        // Cache write failed, non-critical
      });
    }

    return mappedRecommendations;
  } catch (error) {
    console.error('Error generating job recommendations:', error);
    throw error;
  }
};

// Generate tailored resume for specific job
export const generateTailoredResumeForJob = async (
  originalResumeData: ResumeData,
  jobDescription: string,
  _config: UserSettings
): Promise<ResumeData> => {
  const aiConfig = getStoredAIConfig();
  const service = await getService(aiConfig);
  const prompt = generateTailoredResumePrompt(originalResumeData, jobDescription);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    const jsonText = response.text || '';

    if (!jsonText) throw new Error('No tailored resume generated');

    return JSON.parse(cleanJsonString(jsonText)) as ResumeData;
  } catch (error) {
    console.error('Error generating tailored resume:', error);
    throw error;
  }
};
