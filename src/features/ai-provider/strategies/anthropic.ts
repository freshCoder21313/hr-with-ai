import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';

export class AnthropicStrategy implements AIProviderStrategy {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel = 'claude-sonnet-4-20250514';

  constructor(apiKey: string, baseUrl = 'https://api.anthropic.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private mapMessages(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.content,
    }));
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const modelId = options?.modelId || this.defaultModel;

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
        messages: this.mapMessages(messages),
        temperature: options?.temperature,
        ...(options?.systemInstruction && {
          system: options.systemInstruction,
        }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
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
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    const modelId = options?.modelId || this.defaultModel;

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
        messages: this.mapMessages(messages),
        temperature: options?.temperature,
        stream: true,
        ...(options?.systemInstruction && {
          system: options.systemInstruction,
        }),
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

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
  }
}
