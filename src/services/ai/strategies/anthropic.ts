import { z } from 'zod';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';
import { normalizeMessages } from '@/lib/aiResponseHelper';
import { jsonOnlyInstruction, parseStructuredResponse } from '@/lib/aiStructuredOutput';
import { classifyProviderError, AIStructuredOutputError } from '../aiErrors';

export class AnthropicStrategy implements AIProviderStrategy {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel = 'claude-sonnet-4-20250514';

  constructor(apiKey: string, baseUrl = 'https://api.anthropic.com', defaultModel?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    if (defaultModel) {
      this.defaultModel = defaultModel;
    }
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const modelId = options?.modelId || this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 4096,
          messages: normalizeMessages(messages),
          temperature: options?.temperature,
          ...(options?.systemInstruction && {
            system: options.systemInstruction,
          }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw classifyProviderError(new Error(errorText), 'anthropic', response.status);
      }

      const data = await response.json();

      return {
        text: data.content?.[0]?.text || '',
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
        },
        rawResponse: data,
      };
    } catch (error) {
      throw classifyProviderError(error, 'anthropic');
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
    const modelId = options?.modelId || this.defaultModel;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 4096,
          messages: normalizeMessages(messages),
          temperature: options?.temperature,
          stream: true,
          ...(options?.systemInstruction && {
            system: options.systemInstruction,
          }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw classifyProviderError(new Error(errorText), 'anthropic', response.status);
      }
    } catch (error) {
      throw classifyProviderError(error, 'anthropic');
    }

    if (!response.body) throw classifyProviderError(new Error('No response body'), 'anthropic');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const json = JSON.parse(data);
              const delta = json.delta?.text;
              if (delta) yield delta;
            } catch {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      throw classifyProviderError(error, 'anthropic');
    }
  }
}
