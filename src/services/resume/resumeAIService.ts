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
import { getService, resolveConfig, AIConfigInput } from '../ai/aiConfigService';
import { cleanJsonString } from '../aiUtils';

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
        console.log('Using cached resume analysis');
        return cachedResume.analysisResult;
      }
    } catch (e) {
      console.warn('Failed to check cache:', e);
    }
  }

  const prompt = getResumeAnalysisPrompt(resumeText, jobDescription);

  try {
    let jsonText = '';

    if (config.baseUrl) {
      const response = await service.generateText([{ role: 'user', content: prompt }], {
        jsonMode: true,
      });
      jsonText = response.text;
    } else {
      const schema = {
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['matchScore', 'summary', 'missingKeywords', 'improvements'],
      };
      const response = await service.generateText([{ role: 'user', content: prompt }], { schema });
      jsonText = response.text;
    }

    if (!jsonText) throw new Error('No analysis generated');

    const result = JSON.parse(cleanJsonString(jsonText)) as ResumeAnalysis;

    // Save to Cache
    if (resumeId) {
      db.resumes
        .update(resumeId, {
          analysisResult: result,
          analyzedJobDescription: jobDescription,
        })
        .catch((e) => console.warn('Failed to cache analysis:', e));
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
    let jsonText = response.text || '';

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
    let jsonText = '';

    if (config.baseUrl) {
      const response = await service.generateText([{ role: 'user', content: prompt }], {
        jsonMode: true,
      });
      jsonText = response.text;
    } else {
      const schema = {
        type: Type.OBJECT,
        properties: {
          critique: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          rewrittenExample: { type: Type.STRING },
        },
        required: ['critique', 'suggestions', 'rewrittenExample'],
      };
      const response = await service.generateText([{ role: 'user', content: prompt }], { schema });
      jsonText = response.text;
    }

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
    let jsonText = response.text || '';

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
    let jsonText = response.text || '';

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
    let jsonText = response.text || '';

    if (!jsonText) throw new Error('No translated data generated');

    const translated = JSON.parse(cleanJsonString(jsonText)) as ResumeData;
    translated.language = targetLanguage;
    return translated;
  } catch (error) {
    console.error('Error translating resume:', error);
    throw error;
  }
};
