import { Type } from '@google/genai';
import { Interview, Message, InterviewFeedback, UserSettings, ResumeAnalysis } from '@/types';
import { db } from '@/lib/db';
import {
  getSystemPrompt,
  getStartPrompt,
  getFeedbackPrompt,
  getExtractJDInfoPrompt,
  getAnalyzeResumePrompt,
  getHintPrompt,
  getParseResumePrompt,
  getAnalyzeSectionPrompt,
  getTailorResumePrompt,
} from '@/features/interview/promptSystem';
import { generateJobRecommendationsPrompt, generateTailoredResumePrompt } from './jobPromptSystem';
import { ResumeData } from '@/types/resume';
import { AIService } from '@/features/ai-provider/ai.service';
import { AIConfig as ProviderConfig, ChatMessage } from '@/types';

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
}

export type AIConfigInput = string | AIConfig;

export const resolveConfig = (input: AIConfigInput): AIConfig => {
  if (typeof input === 'string') return { apiKey: input };
  return input;
};

// Helper to get AIService instance
const getService = (input: AIConfigInput): AIService => {
  const config = resolveConfig(input);
  const providerConfig: ProviderConfig = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    provider: config.baseUrl ? 'openai' : 'google',
  };
  return new AIService(providerConfig);
};

// --- Main Service Functions ---

export const startInterviewSession = async (
  interview: Interview,
  configInput: AIConfigInput
): Promise<string> => {
  const prompt = getStartPrompt(interview);
  const service = getService(configInput);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }]);
    return response.text || "Hello, let's start the interview. Can you introduce yourself?";
  } catch (error) {
    console.error('Error starting interview:', error);
    return 'System error: Unable to start AI session. Please check your connection or API key.';
  }
};

export async function* streamInterviewMessage(
  history: Message[],
  newMessage: string,
  interviewContext: Interview,
  configInput: AIConfigInput,
  currentCode?: string,
  newImageBase64?: string,
  autoFinishEnabled?: boolean,
  systemInjection?: string | null
) {
  try {
    const service = getService(configInput);

    // Construct Context
    let codeContext = '';
    if (currentCode) {
      codeContext = `
      CURRENT CODE ON EDITOR:
      \`\`\`
      ${currentCode}
      \`\`\`
      `;
    }

    let systemPrompt = getSystemPrompt(interviewContext, codeContext, autoFinishEnabled);

    // Inject Hidden Scenario Instruction if present
    if (systemInjection) {
      systemPrompt += `\n\n${systemInjection}\n\n`;
    }

    const config = resolveConfig(configInput);

    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---
      // For OpenAI, we reconstruct the chat history as messages
      const messages: ChatMessage[] = history.map((m) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content,
        // Note: OpenAI strategy doesn't support images in history yet in this implementation if they were there,
        // but 'newImageBase64' is for the *current* message.
      }));

      // Add system prompt
      // The OpenAI strategy supports systemInstruction in options, or we can add as a message
      // Let's add as message to be explicit/consistent with old logic
      // But wait, old logic did: { role: 'system', content: systemPrompt }, ...messages, { role: 'user', content: newMessage }

      const fullMessages: ChatMessage[] = [
        // We can pass system prompt via options, but passing as message is also fine for OpenAI.
        // However, my Strategy implementation maps 'system' role correctly.
        // But to preserve EXACT behavior of "system prompt + history + new message":
      ];

      // OpenAI Strategy handles systemInstruction option.
      // But let's build the array:

      const payload: ChatMessage[] = [...messages, { role: 'user', content: newMessage }];

      const stream = service.streamText(payload, { systemInstruction: systemPrompt });

      for await (const chunk of stream) {
        yield chunk;
      }
    } else {
      // --- Gemini Logic (Preserving the specific prompting style) ---
      const conversationHistory = history
        .map((m) => {
          const role = m.role === 'user' ? 'Candidate' : 'Interviewer';
          const imgTag = m.image ? '[Candidate sent a whiteboard drawing]' : '';
          return `${role}: ${m.content} ${imgTag}`;
        })
        .join('\n');

      const fullPrompt = `
        ${systemPrompt}

        Chat History:
        ${conversationHistory}
        
        Candidate just said: "${newMessage}"
        
        If an image is provided below, it is a whiteboard drawing from the candidate.
      `;

      // Pass as single user message
      const message: ChatMessage = {
        role: 'user',
        content: fullPrompt,
        image: newImageBase64,
      };

      const stream = service.streamText([message]);

      for await (const chunk of stream) {
        yield chunk;
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    yield "I'm having trouble seeing or processing that. Could you try again?";
  }
}

export const generateInterviewFeedback = async (
  interview: Interview,
  configInput: AIConfigInput
): Promise<InterviewFeedback> => {
  const service = getService(configInput);
  const config = resolveConfig(configInput); // Need raw config to check if OpenAI

  const conversationHistory = interview.messages
    .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
    .join('\n');

  let codeContext = '';
  if (interview.code) {
    codeContext = `
      Code written by candidate:
      ${interview.code}
      `;
  }

  const prompt = getFeedbackPrompt(interview, conversationHistory, codeContext);

  try {
    let jsonText = '';

    if (config.baseUrl) {
      // OpenAI - uses jsonMode
      const response = await service.generateText([{ role: 'user', content: prompt }], {
        jsonMode: true,
      });
      jsonText = response.text;
    } else {
      // Gemini - uses schema
      const schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: 'Score out of 10' },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyQuestionAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                analysis: { type: Type.STRING },
                improvement: { type: Type.STRING },
              },
            },
          },
          mermaidGraphCurrent: {
            type: Type.STRING,
            description: 'Mermaid graph definition for current performance',
          },
          mermaidGraphPotential: {
            type: Type.STRING,
            description: 'Mermaid graph definition for improved potential performance',
          },
          resilienceScore: {
            type: Type.NUMBER,
            description: 'Score 0-10 on ability to handle pressure/gaslighting (optional)',
          },
          cultureFitScore: {
            type: Type.NUMBER,
            description: 'Score 0-10 on fit for the specific Company Status (optional)',
          },
          badges: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "Awards like 'Survivor' (finished hardcore), 'Culture Fit King', 'Tech Wizard'",
          },
          recommendedResources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                description: { type: Type.STRING },
                searchQuery: { type: Type.STRING },
              },
            },
          },
        },
        required: [
          'score',
          'summary',
          'strengths',
          'weaknesses',
          'keyQuestionAnalysis',
          'mermaidGraphCurrent',
          'mermaidGraphPotential',
          'recommendedResources',
          'resilienceScore',
          'cultureFitScore',
          'badges',
        ],
      };

      const response = await service.generateText([{ role: 'user', content: prompt }], { schema });
      jsonText = response.text;
    }

    if (!jsonText) throw new Error('No feedback generated');

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonText) as InterviewFeedback;
  } catch (error) {
    console.error('Error generating feedback:', error);
    throw error;
  }
};

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
    // Both providers use simple text generation here, usually returning JSON string because prompt asks for it
    // The prompt likely says "Return JSON".
    const response = await service.generateText([{ role: 'user', content: prompt }]);
    let jsonText = response.text || '';

    if (!jsonText) throw new Error('No information extracted');

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error extracting info from JD:', error);
    throw error;
  }
};

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

  const prompt = getAnalyzeResumePrompt(resumeText, jobDescription);

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

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonText) as ResumeAnalysis;

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

export interface InterviewHints {
  level1: string;
  level2: string;
  level3: string;
}

export const generateInterviewHints = async (
  lastQuestion: string,
  context: string,
  configInput: AIConfigInput
): Promise<InterviewHints> => {
  const config = resolveConfig(configInput);
  const service = getService(configInput);
  const prompt = getHintPrompt(lastQuestion, context);

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
          level1: { type: Type.STRING },
          level2: { type: Type.STRING },
          level3: { type: Type.STRING },
        },
        required: ['level1', 'level2', 'level3'],
      };
      const response = await service.generateText([{ role: 'user', content: prompt }], { schema });
      jsonText = response.text;
    }

    if (!jsonText) throw new Error('No hints generated');

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText) as InterviewHints;
  } catch (error) {
    console.error('Error generating hints:', error);
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
    // Note: Original code for Gemini didn't specify a schema, just responseMimeType: 'application/json'
    // So we can assume jsonMode for both
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    let jsonText = response.text || '';

    if (!jsonText) throw new Error('No parsed data generated');

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText) as ResumeData;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
};

export const analyzeResumeSection = async (
  sectionName: string,
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

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error analyzing section:', error);
    throw error;
  }
};

export const tailorResumeToJob = async (
  sourceResume: ResumeData,
  jobDescription: string,
  configInput: AIConfigInput
): Promise<ResumeData> => {
  const service = getService(configInput);
  const prompt = getTailorResumePrompt(sourceResume, jobDescription);

  try {
    const response = await service.generateText([{ role: 'user', content: prompt }], {
      jsonMode: true,
    });
    let jsonText = response.text || '';

    if (!jsonText) throw new Error('No tailored resume generated');

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText) as ResumeData;
  } catch (error) {
    console.error('Error tailoring resume:', error);
    throw error;
  }
};

export const getStoredAIConfig = (): AIConfig => {
  return {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    baseUrl: localStorage.getItem('custom_base_url') || undefined,
    modelId: localStorage.getItem('custom_model_id') || undefined,
  };
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

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    const recommendations = JSON.parse(jsonText);

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

    jsonText = jsonText.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText) as ResumeData;
  } catch (error) {
    console.error('Error generating tailored resume:', error);
    throw error;
  }
};
