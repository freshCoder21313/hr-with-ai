import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';
import { jsonOnlyInstruction, parseStructuredResponse } from '@/lib/aiStructuredOutput';
import { classifyProviderError, AIStructuredOutputError } from '../aiErrors';

type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export class GoogleGeminiStrategy implements AIProviderStrategy {
  private client: GoogleGenAI;
  private defaultModel = 'gemini-1.5-pro';
  private apiKey: string;
  private baseUrl?: string;

  constructor(apiKey: string, baseUrl?: string, defaultModel?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = new GoogleGenAI({ apiKey });
    if (defaultModel) {
      this.defaultModel = defaultModel;
    }
  }

  private mapMessagesToContent(messages: ChatMessage[]) {
    return messages.map((msg) => {
      const parts: ContentPart[] = [{ text: msg.content }];

      if (msg.image) {
        const cleanBase64 = msg.image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/png',
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

    const generationConfig: Record<string, unknown> = {};
    if (options?.temperature) generationConfig.temperature = options.temperature;
    if (options?.jsonMode || options?.schema) {
      generationConfig.responseMimeType = 'application/json';
      if (options.schema) {
        generationConfig.responseSchema = options.schema;
      }
    }

    // Custom Base URL Handling
    if (this.baseUrl) {
      try {
        const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
        const url = `${cleanBaseUrl}/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        const payload = {
          contents,
          generationConfig,
          systemInstruction: options?.systemInstruction
            ? { parts: [{ text: options.systemInstruction }] }
            : undefined,
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw classifyProviderError(new Error(response.statusText), 'google', response.status);
        }

        const data = await response.json();

        // Extract text from Gemini response structure
        // candidates[0].content.parts[0].text
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
          text,
          rawResponse: data,
        };
      } catch (error) {
        throw classifyProviderError(error, 'google');
      }
    }

    // Standard SDK Handling
    const config: Record<string, unknown> = {};
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
    } catch (error: unknown) {
      // SDK errors often have status or statusCode or code
      const err = error as Record<string, unknown>;
      const status = err.status || err.statusCode || err.code;
      throw classifyProviderError(error, 'google', typeof status === 'number' ? status : undefined);
    }
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: z.ZodType<T>,
    options?: AIRequestOptions
  ): Promise<T> {
    const systemInstruction = options?.systemInstruction
      ? `${options.systemInstruction}\n\n${jsonOnlyInstruction}`
      : jsonOnlyInstruction;
    const response = await this.generateText(messages, {
      ...options,
      jsonMode: true,
      systemInstruction,
    });

    try {
      return parseStructuredResponse(response.text, schema);
    } catch (error) {
      throw new AIStructuredOutputError(
        error instanceof Error ? error.message : 'Failed to parse structured response',
        error
      );
    }
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    const contents = this.mapMessagesToContent(messages);
    const modelId = options?.modelId || this.defaultModel;

    const generationConfig: Record<string, unknown> = {};
    if (options?.temperature) generationConfig.temperature = options.temperature;

    if (this.baseUrl) {
      // Remove trailing slash
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const url = `${cleanBaseUrl}/v1beta/models/${modelId}:streamGenerateContent?key=${this.apiKey}`;

      const payload = {
        contents,
        generationConfig,
        systemInstruction: options?.systemInstruction
          ? { parts: [{ text: options.systemInstruction }] }
          : undefined,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw classifyProviderError(new Error(response.statusText), 'google', response.status);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw classifyProviderError(error, 'google');
      }

      if (!response.body) throw classifyProviderError(new Error('No response body'), 'google');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Robust parsing for stream of JSON objects (possibly inside array)
          let processedIndex = 0;
          let braceCount = 0;
          let inString = false;
          let escaped = false;
          let startIndex = -1;

          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];

            // Handle strings to avoid counting braces inside strings
            if (char === '"' && !escaped) {
              inString = !inString;
            }
            if (inString) {
              escaped = char === '\\' && !escaped;
              continue; // Skip structure checks inside strings
            }
            escaped = false; // Reset escape if not in string (though outside string escape means nothing usually)

            if (char === '{') {
              if (braceCount === 0) {
                startIndex = i; // Mark start of a top-level object
              }
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0 && startIndex !== -1) {
                // Found a complete object from startIndex to i
                const jsonStr = buffer.substring(startIndex, i + 1);
                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) yield text;
                } catch {
                  // Ignore parse errors, maybe not a valid object or different structure
                }

                startIndex = -1; // Reset
                processedIndex = i + 1; // Mark as processed
              }
            }
          }

          // Remove processed part from buffer to save memory
          if (processedIndex > 0) {
            buffer = buffer.substring(processedIndex);
          }
        }
      } catch (error) {
        throw classifyProviderError(error, 'google');
      }
      return;
    }

    // Standard SDK Handling
    const config: Record<string, unknown> = {};
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
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const status = err.status || err.statusCode || err.code;
      throw classifyProviderError(error, 'google', typeof status === 'number' ? status : undefined);
    }
  }
}
