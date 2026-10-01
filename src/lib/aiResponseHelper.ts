import { ChatMessage } from '@/types';

export const normalizeMessages = (messages: ChatMessage[]) => {
  return messages.map((msg) => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.content,
  }));
};
