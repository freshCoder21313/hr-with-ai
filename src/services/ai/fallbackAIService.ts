import { z } from 'zod';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions, AIConfig } from '@/types';
import { AIService, AIServiceOptions } from './ai.service';
import { resolveCandidates, CandidateConfig } from './aiCandidateResolver';
import { AIProviderError, AIStructuredOutputError } from './aiErrors';
import { logger } from '@/lib/logger';

/**
 * An AI service that wraps multiple providers and handles automatic fallback.
 */
export class FallbackAIService implements AIProviderStrategy {
  private candidates: CandidateConfig[] = [];
  private options?: AIServiceOptions;

  constructor(private initialConfig: AIConfig, options?: AIServiceOptions) {
    this.options = options;
  }

  private async ensureResolved() {
    if (this.candidates.length === 0) {
      this.candidates = await resolveCandidates(this.initialConfig);
    }
  }

  private createService(config: CandidateConfig): AIService {
    return new AIService(config, this.options);
  }

  private async executeWithFallback<T>(
    operation: (service: AIService) => Promise<T>
  ): Promise<T> {
    await this.ensureResolved();
    
    const errors: Array<{ provider: string; model?: string; kind: string }> = [];

    for (let i = 0; i < this.candidates.length; i++) {
      const candidate = this.candidates[i];
      const service = this.createService(candidate);

      try {
        return await operation(service);
      } catch (error) {
        if (error instanceof AIStructuredOutputError) {
          // Structured output parsing errors NEVER fallback to avoid burning quota on bad prompts/schemas
          throw error;
        }

        if (
          error instanceof AIProviderError && 
          error.fallbackEligible && 
          i < this.candidates.length - 1
        ) {
          logger.warn(`AI Provider ${candidate.provider} failed (${error.kind}). Falling back to next candidate...`);
          errors.push({ 
            provider: candidate.provider, 
            model: candidate.modelId, 
            kind: error.kind 
          });
          continue;
        }

        // If we reached here, it's either not fallback eligible or it's the last candidate
        if (errors.length > 0) {
          const finalKind = error instanceof AIProviderError ? error.kind : 'unknown';
          errors.push({ 
            provider: candidate.provider, 
            model: candidate.modelId, 
            kind: finalKind 
          });
          // Secret-safe aggregate error
          throw new Error(`AI service exhausted all candidates: ${JSON.stringify(errors)}`);
        }
        
        throw error;
      }
    }

    throw new Error('AI service exhausted all candidates (empty chain)');
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    return this.executeWithFallback((service) => service.generateText(messages, options));
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: z.ZodType<T>,
    options?: AIRequestOptions
  ): Promise<T> {
    return this.executeWithFallback((service) => service.generateStructured(messages, schema, options));
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    await this.ensureResolved();

    const errors: Array<{ provider: string; model?: string; kind: string }> = [];

    for (let i = 0; i < this.candidates.length; i++) {
      const candidate = this.candidates[i];
      const service = this.createService(candidate);
      let hasYielded = false;

      try {
        const stream = service.streamText(messages, options);
        for await (const chunk of stream) {
          hasYielded = true;
          yield chunk;
        }
        return; // Success
      } catch (error) {
        // After first yield, we cannot fallback as it would corrupt the stream content
        if (hasYielded) {
          throw error;
        }

        if (
          error instanceof AIProviderError && 
          error.fallbackEligible && 
          i < this.candidates.length - 1
        ) {
          logger.warn(`AI Provider ${candidate.provider} stream failed before first yield. Falling back...`);
          errors.push({ 
            provider: candidate.provider, 
            model: candidate.modelId, 
            kind: error.kind 
          });
          continue;
        }

        if (errors.length > 0) {
          const finalKind = error instanceof AIProviderError ? error.kind : 'unknown';
          errors.push({ 
            provider: candidate.provider, 
            model: candidate.modelId, 
            kind: finalKind 
          });
          throw new Error(`AI service exhausted all candidates (stream): ${JSON.stringify(errors)}`);
        }
        
        throw error;
      }
    }
  }

  async ask(prompt: string, history: ChatMessage[] = [], options?: AIRequestOptions): Promise<AIResponse> {
    const messages: ChatMessage[] = [...history, { role: 'user', content: prompt }];
    return this.generateText(messages, options);
  }
}
