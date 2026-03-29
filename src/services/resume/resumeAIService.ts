import { Type } from '@google/genai';
import { ResumeAnalysis } from '@/types';
import { db } from '@/lib/db';
import {
  getResumeAnalysisPrompt,
  getParseResumePrompt,
  getAnalyzeSectionPrompt,
  getTailoredResumePrompt,
} from '@/features/interview/promptSystem';
import { ResumeData } from '@/types/resume';
import { getService, resolveConfig, AIConfigInput } from '@/services/ai/aiConfigService';
import { cleanJsonString } from '@/services/aiUtils';
import { getAIResponseOptions } from '@/lib/aiResponseHelper';

export const analyzeResume = async (
  resumeText: string,
  jobDescription: string,
  configInput: AIConfigInput,
  resumeId?: number
): Promise<ResumeAnalysis> => {
  const config = resolveConfig(configInput);
  const service = getService(configInput);

  // Check Cache
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

  const prompt = getResumeAnalysisPrompt(resumeText, jobDescription);

  try {
    const responseOptions = getAIResponseOptions(
      config,
      {
        matchScore: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      ['matchScore', 'summary', 'missingKeywords', 'improvements']
    );

    let jsonText = '';
    const response = await service.generateText(
      [{ role: 'user', content: prompt }],
      responseOptions
    );
    jsonText = response.text;

    if (!jsonText) throw new Error('No analysis generated');

    const result = JSON.parse(cleanJsonString(jsonText)) as ResumeAnalysis;

    // Save to Cache
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
    console.error('Error analyzing resume:', error);
    throw error;
  }
};

export const parseResumeToJSON = async (
  rawText: string,
  configInput: AIConfigInput
): Promise<ResumeData> => {
  const service = getService(configInput);
  const prompt = getParseResumePrompt(rawText);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    const jsonText = response.text || '';

    if (!jsonText) throw new Error('No parsed data generated');

    return JSON.parse(cleanJsonString(jsonText)) as ResumeData;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
};

export const analyzeResumeSection = async (
  sectionName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sectionData: any,
  configInput: AIConfigInput
): Promise<{ critique: string; suggestions: string[]; rewrittenExample: string }> => {
  const config = resolveConfig(configInput);
  const service = getService(configInput);
  const prompt = getAnalyzeSectionPrompt(sectionName, sectionData);

  try {
    const responseOptions = getAIResponseOptions(
      config,
      {
        critique: { type: Type.STRING },
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        rewrittenExample: { type: Type.STRING },
      },
      ['critique', 'suggestions', 'rewrittenExample']
    );

    let jsonText = '';
    const response = await service.generateText(
      [{ role: 'user', content: prompt }],
      responseOptions
    );
    jsonText = response.text;

    if (!jsonText) throw new Error('No analysis generated');

    return JSON.parse(cleanJsonString(jsonText));
  } catch (error) {
    console.error('Error analyzing section:', error);
    throw error;
  }
};

export const tailorResumeToJob = async (
  sourceResume: ResumeData,
  jobDescription: string,
  configInput: AIConfigInput,
  finalPrompt?: string
): Promise<ResumeData> => {
  const service = getService(configInput);
  const prompt = finalPrompt || getTailoredResumePrompt(sourceResume, jobDescription);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    const jsonText = response.text || '';

    if (!jsonText) throw new Error('No tailored resume generated');

    return JSON.parse(cleanJsonString(jsonText)) as ResumeData;
  } catch (error) {
    console.error('Error tailoring resume:', error);
    throw error;
  }
};

// New function for Smart Tailor page to avoid breaking existing calls
export const tailorResumeV2 = async (
  configInput: AIConfigInput,
  prompt: string
): Promise<ResumeData> => {
  const service = getService(configInput);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    const jsonText = response.text || '';

    if (!jsonText) throw new Error('No tailored resume generated');

    return JSON.parse(cleanJsonString(jsonText)) as ResumeData;
  } catch (error) {
    console.error('Error tailoring resume (V2):', error);
    throw error;
  }
};

export const translateResume = async (
  resumeData: ResumeData,
  targetLanguage: 'vi' | 'en',
  configInput: AIConfigInput
): Promise<ResumeData> => {
  const service = getService(configInput);
  const prompt = `Translate the following JSON resume data into ${
    targetLanguage === 'vi' ? 'Vietnamese' : 'English'
  }. Keep the exact same JSON structure, keys, and formatting. Only translate the values (text content).

Resume JSON:
${JSON.stringify(resumeData)}`;

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    const jsonText = response.text || '';

    if (!jsonText) throw new Error('No translated data generated');

    const translated = JSON.parse(cleanJsonString(jsonText)) as ResumeData;
    translated.language = targetLanguage;
    return translated;
  } catch (error) {
    console.error('Error translating resume:', error);
    throw error;
  }
};
