import { Message } from '@/types';
import { ResumeData } from '@/types/resume';
import { getCVChatSystemPrompt } from '@/features/cv-chat/cvPrompt';
import {
  callOpenAI,
  getGeminiClient,
  resolveConfig,
  AIConfigInput,
} from '@/services/geminiService';

export async function* streamCVChatMessage(
  history: Message[],
  newMessage: string,
  currentResume: ResumeData,
  configInput: AIConfigInput
) {
  const config = resolveConfig(configInput);
  const systemPrompt = getCVChatSystemPrompt(currentResume);

  try {
    if (config.baseUrl) {
      // --- Custom/OpenAI Logic ---

      const conversationHistory = history.slice(0, -1).map((m) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content,
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: newMessage },
      ];

      const response = await callOpenAI(config, messages, config.modelId || 'gpt-4o-mini', true);

      if (!response.body) throw new Error('No response body');
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
              console.error('Error parsing stream:', e);
            }
          }
        }
      }
      return;
    }

    // --- Gemini Logic ---

    const ai = getGeminiClient(config.apiKey);

    // Convert history to prompt format
    const conversationHistory = history
      .slice(0, -1) // Exclude the last message as it's added separately below
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const fullPrompt = `
      ${systemPrompt}

      Chat History:
      ${conversationHistory}
      
      User just said: "${newMessage}"
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    });

    let fullText = '';

    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
        yield chunk.text;
      }
    }

    // Post-processing: Check for JSON blocks in the full text
    // We don't yield the parsed object, the UI will have to parse the accumulated text
    // OR we could yield a special event at the end?
    // For now, standard chat streaming. The UI will use a "Tool/Parser" to detect JSON blocks in the final message.
  } catch (error) {
    console.error('Error in CV Chat:', error);
    yield 'I encountered an error processing your request.';
  }
}
