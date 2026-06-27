import { Interview, Message, InterviewFeedback } from '@/types';
import {
  getSystemPrompt,
  getStartPrompt,
  getFeedbackPrompt,
  getHintPrompt,
} from '@/services/interview/promptSystem';
import { ChatMessage } from '@/types';
import { getService, resolveConfig, AIConfigInput } from '@/services/ai/aiConfigService';
import {
  interviewFeedbackSchemaExtended,
  interviewHintsSchema,
} from '@/features/ai-provider/schemas';

export const startInterviewSession = async (
  interview: Interview,
  configInput: AIConfigInput,
  forceToolsEnabled: boolean = false
): Promise<string> => {
  const prompt = getStartPrompt(interview, forceToolsEnabled);
  const service = await getService(configInput);

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
    const service = await getService(configInput);

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
  const service = await getService(configInput);

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
    return await service.generateStructured(
      [{ role: 'user', content: prompt }],
      interviewFeedbackSchemaExtended
    );
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
  const service = await getService(configInput);
  const prompt = getHintPrompt(lastQuestion, context);

  try {
    return await service.generateStructured(
      [{ role: 'user', content: prompt }],
      interviewHintsSchema
    );
  } catch (error) {
    console.error('Error generating hints:', error);
    throw error;
  }
};
