import {
  AIModelProvider,
  AIProviderStrategy,
  AIConfig,
  ChatMessage,
  AIResponse,
  AIRequestOptions,
} from './types';
import { GoogleGeminiStrategy } from './strategies/google-gemini';
import { OpenAICustomStrategy } from './strategies/openai-custom';

export class AIService {
  private strategy: AIProviderStrategy;

  constructor(config: AIConfig) {
    switch (config.provider) {
      case 'google':
        this.strategy = new GoogleGeminiStrategy(config.apiKey);
        break;
      case 'openai':
        if (!config.baseUrl) {
          throw new Error('Base URL is required for OpenAI/Custom provider');
        }
        this.strategy = new OpenAICustomStrategy(config.apiKey, config.baseUrl, config.modelId);
        break;
      default:
        // Default to Google if something goes wrong or fallback
        // But better to throw
        throw new Error(`Provider '${config.provider}' is not supported`);
    }
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    return this.strategy.generateText(messages, options);
  }

  streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    return this.strategy.streamText(messages, options);
  }

  // Convenience method for simple prompts
  async ask(
    prompt: string,
    history: ChatMessage[] = [],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const messages: ChatMessage[] = [...history, { role: 'user', content: prompt }];
    return this.generateText(messages, options);
  }
}
