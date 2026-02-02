import { GoogleGenAI } from '@google/genai';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '../types';

export class GoogleGeminiStrategy implements AIProviderStrategy {
  private client: GoogleGenAI;
  private defaultModel = 'gemini-2.5-flash';

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  private mapMessagesToContent(messages: ChatMessage[]) {
    // If the previous layer already flattened the history into the last message's content
    // we just send that.
    // However, for true chat mode, we would map roles.
    // Given the current architecture uses manual history flattening,
    // we will likely receive one giant 'user' message or a 'system' + 'user' sequence.

    // Gemini 'generateContent' expects contents array.
    return messages.map((msg) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: msg.content }];

      if (msg.image) {
        const cleanBase64 = msg.image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/png', // Assuming PNG as per original code
            data: cleanBase64,
          },
        });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      };
    });
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const contents = this.mapMessagesToContent(messages);
    const modelId = options?.modelId || this.defaultModel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {};
    if (options?.temperature) config.temperature = options.temperature;
    if (options?.jsonMode || options?.schema) {
      config.responseMimeType = 'application/json';
      if (options.schema) {
        config.responseSchema = options.schema;
      }
    }
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    try {
      const response = await this.client.models.generateContent({
        model: modelId,
        contents,
        config,
      });

      return {
        text: response.text || '',
        rawResponse: response,
      };
    } catch (error) {
      console.error('Gemini Generate Text Error:', error);
      throw error;
    }
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    const contents = this.mapMessagesToContent(messages);
    const modelId = options?.modelId || this.defaultModel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {};
    if (options?.temperature) config.temperature = options.temperature;
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    try {
      const response = await this.client.models.generateContentStream({
        model: modelId,
        contents,
        config,
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error('Gemini Stream Text Error:', error);
      throw error;
    }
  }
}
