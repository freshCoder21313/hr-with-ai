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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok || !response.body) {
          throw new Error(`Custom Gemini Stream Error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Robust parsing for stream of JSON objects (possibly inside array)
          let processedIndex = 0;
          let braceCount = 0;
          let inString = false;
          let escaped = false;
          let startIndex = -1;

          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];

            // Handle strings to avoid counting braces inside strings
            if (char === '"' && !escaped) {
              inString = !inString;
            }
            if (inString) {
              escaped = char === '\\' && !escaped;
              continue; // Skip structure checks inside strings
            }
            escaped = false; // Reset escape if not in string (though outside string escape means nothing usually)

            if (char === '{') {
              if (braceCount === 0) {
                startIndex = i; // Mark start of a top-level object
              }
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0 && startIndex !== -1) {
                // Found a complete object from startIndex to i
                const jsonStr = buffer.substring(startIndex, i + 1);
                try {
                  const data = JSON.parse(jsonStr);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) yield text;
                } catch (e) {
                  // Ignore parse errors, maybe not a valid object or different structure
                }

                startIndex = -1; // Reset
                processedIndex = i + 1; // Mark as processed
              }
            }
          }

          // Remove processed part from buffer to save memory
          if (processedIndex > 0) {
            buffer = buffer.substring(processedIndex);
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        console.error('Custom Gemini Stream Error:', error);
        throw error;
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
