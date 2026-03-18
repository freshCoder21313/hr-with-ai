import { Type } from '@google/genai';
import { UserSettings } from '@/types';
import { db } from '@/lib/db';
import { getExtractJDInfoPrompt } from '@/features/interview/promptSystem';
import {
  generateJobRecommendationsPrompt,
  generateTailoredResumePrompt,
} from '@/services/jobPromptSystem';
import { ResumeData } from '@/types/resume';
import {
  getService,
  resolveConfig,
  AIConfigInput,
  getStoredAIConfig,
} from '@/services/ai/aiConfigService';
import { cleanJsonString } from '@/services/aiUtils';

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
  const service = getService(configInput);
  const prompt = getExtractJDInfoPrompt(jobDescription);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }]);
    let jsonText = response.text || '';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> => {
  const aiConfig = getStoredAIConfig();
  const config = resolveConfig(aiConfig);
  const service = getService(aiConfig);

  // Check Cache
  if (resumeId) {
    try {
      const cachedJobs = await db.job_recommendations.where('resumeId').equals(resumeId).toArray();

      if (cachedJobs && cachedJobs.length > 0) {
        console.log('Using cached job recommendations');
        return cachedJobs.map((job) => ({
          ...job,
          id: `job-${job.createdAt}-${job.id}`,
        }));
      }
    } catch (e) {
      console.warn('Failed to check job cache:', e);
    }
  }

  const prompt = generateJobRecommendationsPrompt(resumeData, language);

  try {
    let jsonText = '';

    if (config.baseUrl) {
      const response = await service.generateText([{ role: 'user', content: prompt }], {
        jsonMode: true,
      });
      jsonText = response.text;
    } else {
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
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
          required: [
            'title',
            'company',
            'industry',
            'location',
            'salaryRange',
            'keyRequirements',
            'whyItFits',
            'matchScore',
            'jobDescription',
          ],
        },
      };
      const response = await service.generateText([{ role: 'user', content: prompt }], { schema });
      jsonText = response.text;
    }

    if (!jsonText) throw new Error('No job recommendations generated');

    const recommendations = JSON.parse(cleanJsonString(jsonText));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedRecommendations = recommendations.map((job: any, index: number) => ({
      ...job,
      id: `job-${Date.now()}-${index}`,
    }));

    // Cache Results
    if (resumeId) {
      db.transaction('rw', db.job_recommendations, async () => {
        await db.job_recommendations.where('resumeId').equals(resumeId).delete();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbJobs = mappedRecommendations.map((job: any) => ({
          ...job,
          resumeId,
          createdAt: Date.now(),
          // Remove the temporary string ID to let Dexie auto-increment ID
          id: undefined,
        }));
        await db.job_recommendations.bulkAdd(dbJobs);
      }).catch((e) => console.warn('Failed to cache jobs:', e));
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
  const service = getService(aiConfig);
  const prompt = generateTailoredResumePrompt(originalResumeData, jobDescription);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    let jsonText = response.text || '';

    if (!jsonText) throw new Error('No tailored resume generated');

    return JSON.parse(cleanJsonString(jsonText)) as ResumeData;
  } catch (error) {
    console.error('Error generating tailored resume:', error);
    throw error;
  }
};
