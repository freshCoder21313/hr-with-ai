import { Message } from '@/types';
import { logger } from '@/lib/logger';
import { ResumeData } from '@/types/resume';
import { getCVChatSystemPrompt } from '@/services/resume/cvPrompt';
import { getService, AIConfigInput } from '@/services/ai/aiConfigService';
import { ChatMessage } from '@/types';

export async function* streamCVChatMessage(
  history: Message[],
  newMessage: string,
  currentResume: ResumeData,
  configInput: AIConfigInput,
  additionalContext?: string
) {
  const service = await getService(configInput);
  const systemPrompt = getCVChatSystemPrompt(currentResume, additionalContext);

  try {
    const conversationHistory = history.slice(0, -1).map((m) => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
    })) as ChatMessage[];

    const stream = service.streamText(
      [...conversationHistory, { role: 'user', content: newMessage }],
      { systemInstruction: systemPrompt }
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    logger.error('Error in CV Chat:', error);
    yield 'I encountered an error processing your request.';
  }
}
