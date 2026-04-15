import { Message } from '@/types';
import { ResumeData } from '@/types/resume';
import { getCVChatSystemPrompt } from '@/features/cv-studio/utils/cvPrompt';
import { resolveConfig, AIConfigInput } from '@/services/ai/aiConfigService';
import { AIService } from '@/features/ai-provider/ai.service';
import { AIConfig, ChatMessage } from '@/types';
import { loadUserSettings } from '@/services/core/settingsService';

export async function* streamCVChatMessage(
  history: Message[],
  newMessage: string,
  currentResume: ResumeData,
  configInput: AIConfigInput,
  additionalContext?: string
) {
  const config = resolveConfig(configInput);

  const providerConfig: AIConfig = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
    provider: config.baseUrl ? 'openai' : 'google',
  };

  const settings = await loadUserSettings();
  const retryOptions =
    settings.maxRetries && settings.maxRetries > 0
      ? {
          retry: {
            maxRetries: settings.maxRetries,
            delay: settings.retryDelay,
            retryOnTimeout: settings.retryOnTimeout,
            retryOnRateLimit: settings.retryOnRateLimit,
          },
        }
      : undefined;

  const service = new AIService(providerConfig, retryOptions);
  const systemPrompt = getCVChatSystemPrompt(currentResume, additionalContext);

  try {
    if (config.baseUrl) {
      // OpenAI Logic
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
    } else {
      // Gemini Logic - Preserving Prompt Construction
      const conversationHistory = history
        .slice(0, -1)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const fullPrompt = `
          ${systemPrompt}

          Chat History:
          ${conversationHistory}
          
          User just said: "${newMessage}"
        `;

      const stream = service.streamText([{ role: 'user', content: fullPrompt }]);

      for await (const chunk of stream) {
        yield chunk;
      }
    }
  } catch (error) {
    console.error('Error in CV Chat:', error);
    yield 'I encountered an error processing your request.';
  }
}
