import { GoogleGenAI, Type } from "@google/genai";
import { Interview, Message, InterviewFeedback } from "../types";

// NOTE: In a production environment, never expose API keys on the client side without proper restrictions.
// We are following the strict instruction to use process.env.API_KEY.
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const startInterviewSession = async (interview: Interview): Promise<string> => {
  try {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Hello, let's start the interview. Can you introduce yourself?";
  } catch (error) {
    console.error("Error starting interview:", error);
    return "System error: Unable to start AI session. Please check your connection.";
  }
};

export async function* streamInterviewMessage(
  history: Message[], 
  newMessage: string, 
  interviewContext: Interview, 
  currentCode?: string,
  newImageBase64?: string
) {
  try {
    // Construct history parts for Gemini
    // We need to convert our internal Message format to Gemini's expected Content format
    // This allows us to pass previous images in the context if supported, 
    // but for 2.0 Flash/Pro, multi-turn images are supported.
    
    // However, to keep it simple and robust:
    // We will provide the text history as 'context' in the system-like prompt, 
    // and ONLY attach the *current* image if provided (Multimodal turn).
    
    // NOTE: Sending full chat history + new image works best.
    
    const conversationHistory = history.map(m => {
       const role = m.role === 'user' ? 'Candidate' : 'Interviewer';
       const imgTag = m.image ? '[Candidate sent a whiteboard drawing]' : '';
       return `${role}: ${m.content} ${imgTag}`;
    }).join('\n');
    
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

      Chat History:
      ${conversationHistory}
      
      Candidate just said: "${newMessage}"
      
      Instructions:
      Respond as the Interviewer. 
      If an image is provided, it is a whiteboard drawing from the candidate (System Design or Diagram). Analyze it critically.
      If code is provided, check for correctness.
      Keep response conversational, professional, and under 150 words.
    `;

    const parts: any[] = [{ text: systemPrompt }];

    // If there is an image attached to this NEW message
    if (newImageBase64) {
      // Clean base64 string if it has data URI prefix
      const cleanBase64 = newImageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64
        }
      });
    }

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash-image', // Switch to a model capable of vision
      contents: [{ parts }],
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error sending message:", error);
    yield "I'm having trouble seeing or processing that. Could you try again?";
  }
}

// Kept for backward compatibility if needed, though mostly replaced by stream
export const sendInterviewMessage = async (history: Message[], newMessage: string): Promise<string> => {
    // Legacy non-streaming implementation
    return "Deprecated"; 
};

export const generateInterviewFeedback = async (interview: Interview): Promise<InterviewFeedback> => {
  try {
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
      
      Return the result in JSON format matching the schema.
      For 'mermaidGraphCurrent' and 'mermaidGraphPotential', generate a valid Mermaid.js graph definition string (graph TD...) that visualizes the candidate's performance flow vs the potential flow.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for deeper reasoning
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
            mermaidGraphPotential: { type: Type.STRING, description: "Mermaid graph definition for improved potential performance" }
          },
          required: ["score", "summary", "strengths", "weaknesses", "keyQuestionAnalysis", "mermaidGraphCurrent", "mermaidGraphPotential"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No feedback generated");
    
    return JSON.parse(text) as InterviewFeedback;

  } catch (error) {
    console.error("Error generating feedback:", error);
    throw error;
  }
};