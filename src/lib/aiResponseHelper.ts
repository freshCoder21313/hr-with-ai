import { Type } from '@google/genai';
import { ChatMessage } from '@/types';

export interface AIResponseConfig {
  baseUrl?: string;
}

export const normalizeMessages = (messages: ChatMessage[]) => {
  return messages.map((msg) => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.content,
  }));
};

export const getAIResponseOptions = (
  config: AIResponseConfig,
  schemaProperties: Record<string, unknown>,
  requiredFields: string[]
): { jsonMode?: boolean; schema?: unknown } => {
  if (config.baseUrl) {
    return { jsonMode: true };
  }

  const schema = {
    type: Type.OBJECT,
    properties: schemaProperties,
    required: requiredFields,
  };

  return { schema };
};

export const getArrayAIResponseOptions = (
  config: AIResponseConfig,
  itemProperties: Record<string, unknown>,
  requiredFields: string[]
): { jsonMode?: boolean; schema?: unknown } => {
  if (config.baseUrl) {
    return { jsonMode: true };
  }

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: itemProperties,
      required: requiredFields,
    },
  };

  return { schema };
};
