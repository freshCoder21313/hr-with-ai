import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';

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
    messages: any[],
    model: string,
    stream: boolean,
    options?: AIRequestOptions
  ): Promise<Response> {
    const body: any = {
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
          'HTTP-Referer': window.location.origin,
          'X-Title': 'HR-With-AI',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    // Map ChatMessage to OpenAI format
    const openAIMessages = messages.map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role, // Handle 'model' role if passed
      content: m.content,
    }));

    // Add system instruction if present
    if (options?.systemInstruction) {
      openAIMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const response = await this.callOpenAI(openAIMessages, this.defaultModel, false, options);

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
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
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    const openAIMessages = messages.map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content,
    }));

    // Add system instruction if present
    if (options?.systemInstruction) {
      openAIMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const response = await this.callOpenAI(openAIMessages, this.defaultModel, true, options);

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
  }
}
