import { GoogleGenAI, Type } from "@google/genai";
import { Interview, Message, InterviewFeedback } from "../types";

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
  
  const prompt = `
    You are an expert technical interviewer.
    You are roleplaying as: ${interview.interviewerPersona}.
    
    Context:
    Company: ${interview.company}
    Job Title: ${interview.jobTitle}
    Language: ${interview.language === 'vi-VN' ? 'Vietnamese' : 'English'}
    
    Candidate Resume Summary:
    ${interview.resumeText.slice(0, 1000)}... (truncated)

    Job Description Summary:
    ${interview.jobDescription.slice(0, 1000)}... (truncated)

    Your goal: Start the interview with a welcoming but professional greeting and ask the first question relevant to the resume or JD.
    Keep it concise (under 100 words).
  `;

  try {
    if (config.baseUrl) {
      // Custom Provider
      const messages = [{ role: "system", content: prompt }]; // Start is essentially a system prompt to get the ball rolling
      // Actually for the first message, we ask the AI to generate it based on the prompt instructions
      // Better: send the prompt as user or system message and expect a response.
      
      const response = await callOpenAI(config, [{ role: "user", content: prompt }], "gpt-3.5-turbo"); // Default fallback model name if not provided
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
  newImageBase64?: string
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

    const systemPrompt = `
      You are continuing an interview.
      
      Context:
      Role: ${interviewContext.interviewerPersona}
      Company: ${interviewContext.company}
      Language: ${interviewContext.language === 'vi-VN' ? 'Vietnamese' : 'English'}

      ${codeContext}

      Instructions:
      Respond as the Interviewer. 
      If code is provided, check for correctness.
      Keep response conversational, professional, and under 150 words.
      
      IMPORTANT: If you mention a specific technical term, library, or concept that is crucial for the candidate to know, wrap it in double brackets like [[React Fiber]] or [[CAP Theorem]]. This will create a clickable search link for them. Do this sparingly (1-2 times per message).
    `;

    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content // Note: Image handling for OpenAI compatible APIs varies wildly. Simplifying to text-only for custom for now unless specifically gpt-4-vision compatible.
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
      
      // History text construction for Gemini (Single turn context injection method)
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

  const prompt = `
    Analyze this interview transcript and provide detailed feedback.
    Language: ${interview.language === 'vi-VN' ? 'Vietnamese' : 'English'}
    
    Transcript:
    ${conversationHistory}

    ${codeContext}
    
    Return the result in raw JSON format matching the schema below. Do NOT use markdown code blocks.
    Schema:
    {
      "score": number (0-10),
      "summary": string,
      "strengths": string[],
      "weaknesses": string[],
      "keyQuestionAnalysis": [
        { "question": string, "analysis": string, "improvement": string }
      ],
      "mermaidGraphCurrent": string (valid Mermaid graph TD definition),
      "mermaidGraphPotential": string (valid Mermaid graph TD definition),
      "recommendedResources": [
        { "topic": string, "description": string, "searchQuery": string }
      ]
    }
  `;

  try {
    let jsonText = "";

    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---
      const messages = [{ role: "user", content: prompt }];
      // Try to force JSON mode if supported, but usually just prompting is enough for smart models
      const response = await callOpenAI(config, messages, "gpt-4o-mini"); // Ideally use a smart model
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
            required: ["score", "summary", "strengths", "weaknesses", "keyQuestionAnalysis", "mermaidGraphCurrent", "mermaidGraphPotential", "recommendedResources"]
          }
        }
      });
      jsonText = response.text || "";
    }

    if (!jsonText) throw new Error("No feedback generated");
    
    // Clean markdown if present (sometimes custom models wrap in ```json ... ```)
    jsonText = jsonText.replace(/```json\n?|\n?```/g, "").trim();

    return JSON.parse(jsonText) as InterviewFeedback;

  } catch (error) {
    console.error("Error generating feedback:", error);
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
