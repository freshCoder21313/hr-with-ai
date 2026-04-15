import { AIProviderStrategy, AIConfig, ChatMessage, AIResponse, AIRequestOptions } from '@/types';
import { GoogleGeminiStrategy } from './strategies/google-gemini';
import { OpenAICustomStrategy } from './strategies/openai-custom';
import { AnthropicStrategy } from './strategies/anthropic';
import { OpenRouterStrategy } from './strategies/openrouter';
import { withRetry, RetryOptions } from '@/services/ai/aiUtils';

export interface AIServiceOptions {
  retry?: Partial<RetryOptions>;
}

export class AIService {
  private strategy: AIProviderStrategy;
  private retryOptions?: Partial<RetryOptions>;

  constructor(config: AIConfig, options?: AIServiceOptions) {
    switch (config.provider) {
      case 'google':
        this.strategy = new GoogleGeminiStrategy(config.apiKey, config.baseUrl);
        break;
      case 'openai':
        if (!config.baseUrl) {
          throw new Error('Base URL is required for OpenAI/Custom provider');
        }
        this.strategy = new OpenAICustomStrategy(config.apiKey, config.baseUrl, config.modelId);
        break;
      case 'anthropic':
        this.strategy = new AnthropicStrategy(config.apiKey, config.baseUrl);
        break;
      case 'openrouter':
        this.strategy = new OpenRouterStrategy(config.apiKey, config.modelId);
        break;
      default:
        throw new Error(`Provider '${config.provider}' is not supported`);
    }
    this.retryOptions = options?.retry;
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    if (this.retryOptions && this.retryOptions.maxRetries && this.retryOptions.maxRetries > 0) {
      return withRetry(() => this.strategy.generateText(messages, options), this.retryOptions);
    }
    return this.strategy.generateText(messages, options);
  }

  streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    if (this.retryOptions && this.retryOptions.maxRetries && this.retryOptions.maxRetries > 0) {
      return this.strategy.streamText(messages, options);
    }
    return this.strategy.streamText(messages, options);
  }

  async ask(
    prompt: string,
    history: ChatMessage[] = [],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const messages: ChatMessage[] = [...history, { role: 'user', content: prompt }];
    return this.generateText(messages, options);
  }
}
