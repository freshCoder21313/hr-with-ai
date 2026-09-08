import { z } from 'zod';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';
import { normalizeMessages } from '@/lib/aiResponseHelper';
import { jsonOnlyInstruction, parseStructuredResponse } from '@/lib/aiStructuredOutput';
import { classifyProviderError, AIStructuredOutputError } from '../aiErrors';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIRequestBody {
  model: string;
  messages: OpenAIMessage[];
  stream: boolean;
  temperature: number;
  response_format?: { type: 'json_object' };
}

export class OpenAICustomStrategy implements AIProviderStrategy {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, baseUrl: string, defaultModel = 'gpt-3.5-turbo') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  private async callOpenAI(
    messages: OpenAIMessage[],
    model: string,
    stream: boolean,
    options?: AIRequestOptions
  ): Promise<Response> {
    const body: OpenAIRequestBody = {
      model: options?.modelId || model,
      messages: messages,
      stream: stream,
      temperature: options?.temperature ?? 0.7,
    };

    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://hr-with-ai',
          'X-Title': 'HR-With-AI',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    // Map ChatMessage to OpenAI format using shared utility
    const openAIMessages = normalizeMessages(messages);

    // Add system instruction if present
    if (options?.systemInstruction) {
      openAIMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    try {
      const response = await this.callOpenAI(openAIMessages, this.defaultModel, false, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw classifyProviderError(new Error(errorText), 'openai', response.status);
      }

      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        rawResponse: data,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
        },
      };
    } catch (error) {
      throw classifyProviderError(error, 'openai');
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
    const openAIMessages = normalizeMessages(messages);

    // Add system instruction if present
    if (options?.systemInstruction) {
      openAIMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    let response: Response;
    try {
      response = await this.callOpenAI(openAIMessages, this.defaultModel, true, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw classifyProviderError(new Error(errorText), 'openai', response.status);
      }
    } catch (error) {
      throw classifyProviderError(error, 'openai');
    }

    if (!response.body) throw classifyProviderError(new Error('No response body'), 'openai');
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
          if (line.trim() === '') continue;
          if (line.includes('[DONE]')) continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      throw classifyProviderError(error, 'openai');
    }
  }
}
