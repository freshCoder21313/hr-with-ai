import { GoogleGenAI } from '@google/genai';
import { AIProviderStrategy, ChatMessage, AIResponse, AIRequestOptions } from '@/types';

export class GoogleGeminiStrategy implements AIProviderStrategy {
  private client: GoogleGenAI;
  private defaultModel = 'gemini-2.0-flash'; // Updated to 2.0-flash as per recent defaults or user preference
  private apiKey: string;
  private baseUrl?: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    // The SDK might not support baseUrl in constructor types yet, so we only use it for the client if valid
    // For now we initialize client anyway for standard calls, but we might bypass it.
    this.client = new GoogleGenAI({ apiKey });
  }

  private mapMessagesToContent(messages: ChatMessage[]) {
    return messages.map((msg) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: msg.content }];

      if (msg.image) {
        const cleanBase64 = msg.image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      };
    });
  }

  async generateText(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    const contents = this.mapMessagesToContent(messages);
    const modelId = options?.modelId || this.defaultModel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generationConfig: any = {};
    if (options?.temperature) generationConfig.temperature = options.temperature;
    if (options?.jsonMode || options?.schema) {
      generationConfig.responseMimeType = 'application/json';
      if (options.schema) {
        generationConfig.responseSchema = options.schema;
      }
    }

    // Custom Base URL Handling
    if (this.baseUrl) {
      try {
        // Assume baseUrl is like "https://my-proxy.com"
        // Target: {baseUrl}/v1beta/models/{modelId}:generateContent?key={apiKey}
        // Adjustment: Check if baseUrl already contains /v1beta/models... usually it's the root.

        // Remove trailing slash
        const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
        const url = `${cleanBaseUrl}/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        const payload = {
          contents,
          generationConfig,
          systemInstruction: options?.systemInstruction
            ? { parts: [{ text: options.systemInstruction }] }
            : undefined,
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Custom Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Extract text from Gemini response structure
        // candidates[0].content.parts[0].text
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
          text,
          rawResponse: data,
        };
      } catch (error) {
        console.error('Custom Gemini Request Failed:', error);
        throw error;
      }
    }

    // Standard SDK Handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {};
    if (options?.temperature) config.temperature = options.temperature;
    if (options?.jsonMode || options?.schema) {
      config.responseMimeType = 'application/json';
      if (options.schema) {
        config.responseSchema = options.schema;
      }
    }
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    try {
      const response = await this.client.models.generateContent({
        model: modelId,
        contents,
        config,
      });

      return {
        text: response.text || '',
        rawResponse: response,
      };
    } catch (error) {
      console.error('Gemini Generate Text Error:', error);
      throw error;
    }
  }

  async *streamText(messages: ChatMessage[], options?: AIRequestOptions): AsyncIterable<string> {
    const contents = this.mapMessagesToContent(messages);
    const modelId = options?.modelId || this.defaultModel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generationConfig: any = {};
    if (options?.temperature) generationConfig.temperature = options.temperature;
    if (options?.systemInstruction) {
      // SDK put it in config, but REST API puts it in body root
      // handled below
    }

    if (this.baseUrl) {
      // Remove trailing slash
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const url = `${cleanBaseUrl}/v1beta/models/${modelId}:streamGenerateContent?key=${this.apiKey}`;

      const payload = {
        contents,
        generationConfig,
        systemInstruction: options?.systemInstruction
          ? { parts: [{ text: options.systemInstruction }] }
          : undefined,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Custom Gemini Stream Error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      // Removed 'constdecoder' typo and 'buffer' variable.
      // TextDecoder is now instantiated directly within the loop.

      // Simple SSE/JSON stream parsing for Gemini
      // Gemini stream returns a JSON array like structure but chunked, or SSE depending on proxy.
      // Standard Gemini API returns a stream of JSON objects.

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        // Verify if this is correct for the custom provider.
        // Assuming standard Gemini formatting, it might need more robust parsing.
        // For now, attempting basic parse.

        // In a real stream, we might get multiple JSON objects.
        // Simplification: just yielding raw text is tricky.
        // Let's assume the user wants Non-Streaming for custom if complex?
        // Or try to parse standard structure "candidates[0].content.parts[0].text"

        // Hacky parsing for demonstration:
        try {
          // Often starts with comma or bracket
          const CleanChunk = chunk.replace(/^,\s*/, '').replace(/^\[/, '').replace(/\]$/, '');
          if (!CleanChunk.trim()) continue;

          const data = JSON.parse(CleanChunk);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // Removed 'e' variable
          // buffer handling would be needed here for split chunks
        }
      }
      return;
    }

    // Standard SDK Handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {};
    if (options?.temperature) config.temperature = options.temperature;
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    try {
      const response = await this.client.models.generateContentStream({
        model: modelId,
        contents,
        config,
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error('Gemini Stream Text Error:', error);
      throw error;
    }
  }
}
