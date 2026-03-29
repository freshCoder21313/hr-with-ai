import { Type } from '@google/genai';
import { Interview, Message, InterviewFeedback } from '@/types';
import {
  getSystemPrompt,
  getStartPrompt,
  getFeedbackPrompt,
  getHintPrompt,
} from '@/features/interview/promptSystem';
import { ChatMessage } from '@/types';
import { getService, resolveConfig, AIConfigInput } from '@/services/ai/aiConfigService';
import { cleanJsonString } from '@/services/aiUtils';
import { getAIResponseOptions } from '@/lib/aiResponseHelper';

export const startInterviewSession = async (
  interview: Interview,
  configInput: AIConfigInput,
  forceToolsEnabled: boolean = false
): Promise<string> => {
  const prompt = getStartPrompt(interview, forceToolsEnabled);
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
  forceToolsEnabled?: boolean,
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

    let systemPrompt = getSystemPrompt(
      interviewContext,
      autoFinishEnabled || false,
      forceToolsEnabled || false
    );
    if (codeContext) {
      systemPrompt += `\n\n${codeContext}\n\n`;
    }

    // Inject Hidden Scenario Instruction if present
    if (systemInjection) {
      systemPrompt += `\n\n${systemInjection}\n\n`;
    }

    const config = resolveConfig(configInput);

    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---
      const messages: ChatMessage[] = history.map((m) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content,
      }));

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
    throw error;
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
    const responseOptions = getAIResponseOptions(
      config,
      {
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
      [
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
      ]
    );

    let jsonText = '';
    const response = await service.generateText(
      [{ role: 'user', content: prompt }],
      responseOptions
    );
    jsonText = response.text;

    if (!jsonText) throw new Error('No feedback generated');

    return JSON.parse(cleanJsonString(jsonText)) as InterviewFeedback;
  } catch (error) {
    console.error('Error generating feedback:', error);
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
    const responseOptions = getAIResponseOptions(
      config,
      {
        level1: { type: Type.STRING },
        level2: { type: Type.STRING },
        level3: { type: Type.STRING },
      },
      ['level1', 'level2', 'level3']
    );

    let jsonText = '';
    const response = await service.generateText(
      [{ role: 'user', content: prompt }],
      responseOptions
    );
    jsonText = response.text;

    if (!jsonText) throw new Error('No hints generated');

    return JSON.parse(cleanJsonString(jsonText)) as InterviewHints;
  } catch (error) {
    console.error('Error generating hints:', error);
    throw error;
  }
};
