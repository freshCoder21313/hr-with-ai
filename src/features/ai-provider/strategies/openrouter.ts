import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';

export class OpenRouterStrategy implements AIProviderStrategy {
  private apiKey: string;
  private defaultModel = 'openai/gpt-4o';

  constructor(
    apiKey: string,
    private modelId = 'openai/gpt-4o'
  ) {
    this.apiKey = apiKey;
  }

  private mapMessages(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.content,
    }));
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const model = options?.modelId || this.defaultModel;

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
        messages: this.mapMessages(messages),
        temperature: options?.temperature,
        ...(options?.systemInstruction && {
          response_format: { type: 'text' },
        }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
      rawResponse: data,
    };
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    const model = options?.modelId || this.defaultModel;

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
        messages: this.mapMessages(messages),
        temperature: options?.temperature,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

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
  }
}
