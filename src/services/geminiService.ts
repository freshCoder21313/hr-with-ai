import { GoogleGenAI, Type } from "@google/genai";
import { Interview, Message, InterviewFeedback, UserSettings, ResumeAnalysis } from "@/types";
import { db } from "@/lib/db";
import { getSystemPrompt, getStartPrompt, getFeedbackPrompt, getExtractJDInfoPrompt, getAnalyzeResumePrompt, getHintPrompt, getParseResumePrompt, getAnalyzeSectionPrompt, getTailorResumePrompt } from "@/features/interview/promptSystem";
import { generateJobRecommendationsPrompt, generateTailoredResumePrompt } from "./jobPromptSystem";
import { ResumeData } from "@/types/resume";

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
}

type AIConfigInput = string | AIConfig;

const resolveConfig = (input: AIConfigInput): AIConfig => {
  if (typeof input === 'string') return { apiKey: input };
  return input;
};

// --- Google Gemini Implementation ---
const getGeminiClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// --- OpenAI Compatible Implementation ---
async function callOpenAI(config: AIConfig, messages: any[], model: string, stream: boolean = false): Promise<Response> {
  if (!config.baseUrl) throw new Error("Base URL required for custom provider");
  
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      // Add generic headers often needed
      'HTTP-Referer': window.location.origin,
      'X-Title': 'HR-With-AI'
    },
    body: JSON.stringify({
      model: config.modelId || model,
      messages: messages,
      stream: stream,
      temperature: 0.7
    })
  });
}

// --- Main Service Functions ---

export const startInterviewSession = async (interview: Interview, configInput: AIConfigInput): Promise<string> => {
  const config = resolveConfig(configInput);
  
  const prompt = getStartPrompt(interview);

  try {
    if (config.baseUrl) {
      // Custom Provider
      const response = await callOpenAI(config, [{ role: "user", content: prompt }], "gpt-3.5-turbo");
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Hello, let's start.";
      
    } else {
      // Gemini
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Updated model
        contents: prompt,
      });
      return response.text || "Hello, let's start the interview. Can you introduce yourself?";
    }
  } catch (error) {
    console.error("Error starting interview:", error);
    return "System error: Unable to start AI session. Please check your connection or API key.";
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
  systemInjection?: string | null // Added parameter
) {
  const config = resolveConfig(configInput);

  try {
    // Construct Context
    let codeContext = "";
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

    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content
        })),
        { role: "user", content: newMessage }
      ];

      const response = await callOpenAI(config, messages, "gpt-3.5-turbo", true);
      
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.includes('[DONE]')) continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch (e) {
              console.error("Error parsing stream:", e);
            }
          }
        }
      }

    } else {
      // --- Gemini Logic ---
      const ai = getGeminiClient(config.apiKey);
      
      const conversationHistory = history.map(m => {
        const role = m.role === 'user' ? 'Candidate' : 'Interviewer';
        const imgTag = m.image ? '[Candidate sent a whiteboard drawing]' : '';
        return `${role}: ${m.content} ${imgTag}`;
      }).join('\n');

      const fullPrompt = `
        ${systemPrompt}

        Chat History:
        ${conversationHistory}
        
        Candidate just said: "${newMessage}"
        
        If an image is provided below, it is a whiteboard drawing from the candidate.
      `;

      const parts: any[] = [{ text: fullPrompt }];

      if (newImageBase64) {
        const cleanBase64 = newImageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64
          }
        });
      }

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash-exp',
        contents: [{ parts }],
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    }
  } catch (error) {
    console.error("Error sending message:", error);
    yield "I'm having trouble seeing or processing that. Could you try again?";
  }
}

export const generateInterviewFeedback = async (interview: Interview, configInput: AIConfigInput): Promise<InterviewFeedback> => {
  const config = resolveConfig(configInput);

  const conversationHistory = interview.messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');
    
  let codeContext = "";
  if (interview.code) {
      codeContext = `
      Code written by candidate:
      ${interview.code}
      `;
  }

  const prompt = getFeedbackPrompt(interview, conversationHistory, codeContext);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
      
    } else {
      // --- Gemini Logic ---
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Score out of 10" },
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
                    improvement: { type: Type.STRING }
                  }
                }
              },
              mermaidGraphCurrent: { type: Type.STRING, description: "Mermaid graph definition for current performance" },
              mermaidGraphPotential: { type: Type.STRING, description: "Mermaid graph definition for improved potential performance" },
              resilienceScore: { type: Type.NUMBER, description: "Score 0-10 on ability to handle pressure/gaslighting (optional)" },
              cultureFitScore: { type: Type.NUMBER, description: "Score 0-10 on fit for the specific Company Status (optional)" },
              badges: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Awards like 'Survivor' (finished hardcore), 'Culture Fit King', 'Tech Wizard'" },
              recommendedResources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    description: { type: Type.STRING },
                    searchQuery: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["score", "summary", "strengths", "weaknesses", "keyQuestionAnalysis", "mermaidGraphCurrent", "mermaidGraphPotential", "recommendedResources", "resilienceScore", "cultureFitScore", "badges"]
          }
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No feedback generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();

    return JSON.parse(jsonText) as InterviewFeedback;

  } catch (error) {
    console.error("Error generating feedback:", error);
    throw error;
  }
};

export const extractInfoFromJD = async (jobDescription: string, configInput: AIConfigInput): Promise<{ company: string, jobTitle: string, interviewerPersona: string }> => {
  const config = resolveConfig(configInput);
  const prompt = getExtractJDInfoPrompt(jobDescription);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No information extracted");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error extracting info from JD:", error);
    throw error;
  }
};

export const analyzeResume = async (resumeText: string, jobDescription: string, configInput: AIConfigInput, resumeId?: number): Promise<ResumeAnalysis> => {
  const config = resolveConfig(configInput);

  // Check Cache
  if (resumeId) {
    try {
      const cachedResume = await db.resumes.get(resumeId);
      if (cachedResume && cachedResume.analysisResult && cachedResume.analyzedJobDescription === jobDescription) {
        console.log("Using cached resume analysis");
        return cachedResume.analysisResult;
      }
    } catch (e) {
      console.warn("Failed to check cache:", e);
    }
  }

  const prompt = getAnalyzeResumePrompt(resumeText, jobDescription);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchScore: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["matchScore", "summary", "missingKeywords", "improvements"]
          }
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No analysis generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(jsonText) as ResumeAnalysis;

    // Save to Cache
    if (resumeId) {
      db.resumes.update(resumeId, {
        analysisResult: result,
        analyzedJobDescription: jobDescription
      }).catch(e => console.warn("Failed to cache analysis:", e));
    }

    return result;

  } catch (error) {
    console.error("Error analyzing resume:", error);
    throw error;
  }
};

export interface InterviewHints {
  level1: string;
  level2: string;
  level3: string;
}

export const generateInterviewHints = async (lastQuestion: string, context: string, configInput: AIConfigInput): Promise<InterviewHints> => {
  const config = resolveConfig(configInput);
  const prompt = getHintPrompt(lastQuestion, context);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              level1: { type: Type.STRING },
              level2: { type: Type.STRING },
              level3: { type: Type.STRING }
            },
            required: ["level1", "level2", "level3"]
          }
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No hints generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonText) as InterviewHints;

  } catch (error) {
    console.error("Error generating hints:", error);
    throw error;
  }
};

export const parseResumeToJSON = async (rawText: string, configInput: AIConfigInput): Promise<ResumeData> => {
  const config = resolveConfig(configInput);
  const prompt = getParseResumePrompt(rawText);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No parsed data generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonText) as ResumeData;

  } catch (error) {
    console.error("Error parsing resume:", error);
    throw error;
  }
};

export const analyzeResumeSection = async (sectionName: string, sectionData: any, configInput: AIConfigInput): Promise<{ critique: string, suggestions: string[], rewrittenExample: string }> => {
  const config = resolveConfig(configInput);
  const prompt = getAnalyzeSectionPrompt(sectionName, sectionData);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              critique: { type: Type.STRING },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              rewrittenExample: { type: Type.STRING }
            },
            required: ["critique", "suggestions", "rewrittenExample"]
          }
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No analysis generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error analyzing section:", error);
    throw error;
  }
};

export const tailorResumeToJob = async (sourceResume: ResumeData, jobDescription: string, configInput: AIConfigInput): Promise<ResumeData> => {
  const config = resolveConfig(configInput);
  const prompt = getTailorResumePrompt(sourceResume, jobDescription);

  try {
    let jsonText = "";

    if (config.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(config, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(config.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No tailored resume generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonText) as ResumeData;

  } catch (error) {
    console.error("Error tailoring resume:", error);
    throw error;
  }
};

export const getStoredAIConfig = (): AIConfig => {
  return {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    baseUrl: localStorage.getItem('custom_base_url') || undefined,
    modelId: localStorage.getItem('custom_model_id') || undefined
  };
};

// Generate job recommendations from resume data
export const generateJobRecommendations = async (
  resumeData: ResumeData,
  language: string,
  config: UserSettings,
  resumeId?: number
): Promise<any[]> => {
  const aiConfig = getStoredAIConfig();

  // Check Cache
  if (resumeId) {
    try {
      const cachedJobs = await db.job_recommendations
        .where('resumeId')
        .equals(resumeId)
        .toArray();
      
      if (cachedJobs && cachedJobs.length > 0) {
        console.log("Using cached job recommendations");
        return cachedJobs.map(job => ({
           ...job,
           id: `job-${job.createdAt}-${job.id}`
        }));
      }
    } catch (e) {
      console.warn("Failed to check job cache:", e);
    }
  }

  const prompt = generateJobRecommendationsPrompt(resumeData, language);

  try {
    let jsonText = "";

    if (aiConfig.baseUrl) {
      // Custom Provider
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(aiConfig, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      // Gemini
      const ai = getGeminiClient(aiConfig.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
                jobDescription: { type: Type.STRING }
              },
              required: ["title", "company", "industry", "location", "salaryRange", "keyRequirements", "whyItFits", "matchScore", "jobDescription"]
            }
          }
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No job recommendations generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    const recommendations = JSON.parse(jsonText);
    
    const mappedRecommendations = recommendations.map((job: any, index: number) => ({
      ...job,
      id: `job-${Date.now()}-${index}`
    }));

    // Cache Results
    if (resumeId) {
      db.transaction('rw', db.job_recommendations, async () => {
        await db.job_recommendations.where('resumeId').equals(resumeId).delete();
        const dbJobs = mappedRecommendations.map((job: any) => ({
           ...job,
           resumeId,
           createdAt: Date.now(),
           // Remove the temporary string ID to let Dexie auto-increment ID
           id: undefined 
        }));
        await db.job_recommendations.bulkAdd(dbJobs);
      }).catch(e => console.warn("Failed to cache jobs:", e));
    }

    return mappedRecommendations;

  } catch (error) {
    console.error("Error generating job recommendations:", error);
    throw error;
  }
};

// Generate tailored resume for specific job
export const generateTailoredResumeForJob = async (
  originalResumeData: ResumeData,
  jobDescription: string,
  config: UserSettings
): Promise<ResumeData> => {
  const aiConfig = getStoredAIConfig();
  const prompt = generateTailoredResumePrompt(originalResumeData, jobDescription);

  try {
    let jsonText = "";

    if (aiConfig.baseUrl) {
      const messages = [{ role: "user", content: prompt }];
      const response = await callOpenAI(aiConfig, messages, "gpt-4o-mini");
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || "";
    } else {
      const ai = getGeminiClient(aiConfig.apiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No tailored resume generated");
    
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonText) as ResumeData;

  } catch (error) {
    console.error("Error generating tailored resume:", error);
    throw error;
  }
};
