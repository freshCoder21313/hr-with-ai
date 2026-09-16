import { z } from 'zod';

export type AIModelProvider = 'google' | 'openai' | 'anthropic' | 'openrouter';

export interface AIProviderProfile {
  id: string;
  name: string;
  provider: AIModelProvider;
  apiKey: string;
  baseUrl?: string;
  modelIds: string[];
  enabled: boolean;
}

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
  provider: AIModelProvider;
  profileId?: string;
  source?: 'active-profile' | 'explicit';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
  image?: string; // Base64 string for multimodal
}

export interface AIResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
  rawResponse?: unknown;
}

export interface AIRequestOptions {
  temperature?: number;
  jsonMode?: boolean;
  schema?: unknown; // For structured output
  systemInstruction?: string;
  modelId?: string; // Allow overriding model per request
}

export interface AIProviderStrategy {
  generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse>;
  streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string>;
  generateStructured<T>(
    messages: ChatMessage[],
    schema: z.ZodType<T>,
    options?: AIRequestOptions
  ): Promise<T>;
}
