import { ResumeAnalysis } from '@/types';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import {
  getResumeAnalysisPrompt,
  getParseResumePrompt,
  getAnalyzeSectionPrompt,
  getTailoredResumePrompt,
} from '@/services/prompts';
import { ResumeData } from '@/types/resume';
import { getService, AIConfigInput } from '@/services/ai/aiConfigService';
import {
  resumeAnalysisSchema,
  resumeDataSchema,
  resumeSectionAnalysisSchema,
} from '@/services/ai/schemas';

export const analyzeResume = async (
  resumeText: string,
  jobDescription: string,
  configInput: AIConfigInput,
  resumeId?: number
): Promise<ResumeAnalysis> => {
  if (resumeId) {
    try {
      const cachedResume = await db.resumes.get(resumeId);
      if (
        cachedResume &&
        cachedResume.analysisResult &&
        cachedResume.analyzedJobDescription === jobDescription
      ) {
        return cachedResume.analysisResult;
      }
    } catch {
      // Cache check failed, will fetch fresh data
    }
  }

  const service = await getService(configInput);
  const prompt = getResumeAnalysisPrompt(resumeText, jobDescription);

  try {
    const result = await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeAnalysisSchema
    );

    if (resumeId) {
      db.resumes
        .update(resumeId, {
          analysisResult: result,
          analyzedJobDescription: jobDescription,
        })
        .catch(() => {
          // Cache write failed, non-critical
        });
    }

    return result;
  } catch (error) {
    logger.error('Error analyzing resume:', error);
    throw error;
  }
};

export const parseResumeToJSON = async (
  rawText: string,
  configInput: AIConfigInput
): Promise<ResumeData> => {
  const service = await getService(configInput);
  const prompt = getParseResumePrompt(rawText);

  try {
    return (await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeDataSchema
    )) as unknown as ResumeData;
  } catch (error) {
    logger.error('Error parsing resume:', error);
    throw error;
  }
};

export const analyzeResumeSection = async (
  sectionName: string,
  sectionData: unknown,
  configInput: AIConfigInput
): Promise<{ critique: string; suggestions: string[]; rewrittenExample: string }> => {
  const service = await getService(configInput);
  const prompt = getAnalyzeSectionPrompt(sectionName, sectionData);

  try {
    return await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeSectionAnalysisSchema
    );
  } catch (error) {
    logger.error('Error analyzing section:', error);
    throw error;
  }
};

export const tailorResumeToJob = async (
  sourceResume: ResumeData,
  jobDescription: string,
  configInput: AIConfigInput,
  finalPrompt?: string
): Promise<ResumeData> => {
  const service = await getService(configInput);
  const prompt = finalPrompt || getTailoredResumePrompt(sourceResume, jobDescription);

  try {
    return (await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeDataSchema
    )) as unknown as ResumeData;
  } catch (error) {
    logger.error('Error tailoring resume:', error);
    throw error;
  }
};

export const tailorResumeV2 = async (
  configInput: AIConfigInput,
  prompt: string
): Promise<ResumeData> => {
  const service = await getService(configInput);

  try {
    return (await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeDataSchema
    )) as unknown as ResumeData;
  } catch (error) {
    logger.error('Error tailoring resume (V2):', error);
    throw error;
  }
};

export const translateResume = async (
  resumeData: ResumeData,
  targetLanguage: 'vi' | 'en',
  configInput: AIConfigInput
): Promise<ResumeData> => {
  const service = await getService(configInput);
  const prompt = `Translate the following JSON resume data into ${
    targetLanguage === 'vi' ? 'Vietnamese' : 'English'
  }. Keep the exact same JSON structure, keys, and formatting. Only translate the values (text content).

Resume JSON:
${JSON.stringify(resumeData)}`;

  try {
    const translated = (await service.generateStructured(
      [{ role: 'user', content: prompt }],
      resumeDataSchema
    )) as unknown as ResumeData;
    translated.language = targetLanguage;
    return translated;
  } catch (error) {
    logger.error('Error translating resume:', error);
    throw error;
  }
};
