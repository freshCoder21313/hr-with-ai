import { z } from 'zod';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';
import { normalizeMessages } from '@/lib/aiResponseHelper';
import { jsonOnlyInstruction, parseStructuredResponse } from '@/lib/aiStructuredOutput';
import { classifyProviderError, AIStructuredOutputError } from '../aiErrors';

export class OpenRouterStrategy implements AIProviderStrategy {
  private apiKey: string;

  constructor(
    apiKey: string,
    private modelId = 'openai/gpt-4o'
  ) {
    this.apiKey = apiKey;
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const model = options?.modelId || this.modelId;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer':
            typeof window !== 'undefined' ? window.location.origin : 'https://hr-with-ai',
          'X-Title': 'HR-With-AI',
        },
        body: JSON.stringify({
          model,
          messages: normalizeMessages(messages),
          temperature: options?.temperature,
          ...(options?.jsonMode && {
            response_format: { type: 'json_object' },
          }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw classifyProviderError(new Error(errorText), 'openrouter', response.status);
      }

      const data = await response.json();

      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
        rawResponse: data,
      };
    } catch (error) {
      throw classifyProviderError(error, 'openrouter');
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
    const model = options?.modelId || this.modelId;

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer':
            typeof window !== 'undefined' ? window.location.origin : 'https://hr-with-ai',
          'X-Title': 'HR-With-AI',
        },
        body: JSON.stringify({
          model,
          messages: normalizeMessages(messages),
          temperature: options?.temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw classifyProviderError(new Error(errorText), 'openrouter', response.status);
      }
    } catch (error) {
      throw classifyProviderError(error, 'openrouter');
    }

    if (!response.body) throw classifyProviderError(new Error('No response body'), 'openrouter');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {
              // Ignore non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      throw classifyProviderError(error, 'openrouter');
    }
  }
}
