import { useMemo, useState } from 'react';
import { Message } from '@/types';

function detectAction(messages: Message[] | undefined): 'code' | 'draw' | null {
  if (!messages?.length) return null;
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== 'model') return null;

  const text = lastMsg.content;
  if (text.includes('<ACTION type="CODE"')) return 'code';
  if (text.includes('<ACTION type="DRAW"')) return 'draw';

  const lower = text.toLowerCase();
  if (
    lower.includes('code') ||
    lower.includes('programming') ||
    lower.includes('function') ||
    lower.includes('implement')
  ) {
    return 'code';
  }
  if (
    lower.includes('draw') ||
    lower.includes('diagram') ||
    lower.includes('whiteboard') ||
    lower.includes('visualize')
  ) {
    return 'draw';
  }
  return null;
}

/**
 * Suggested tool actions from the latest model message.
 * Derived via useMemo; can be cleared locally after the user acts.
 */
export function useSuggestedAction(messages: Message[] | undefined) {
  const derived = useMemo(() => detectAction(messages), [messages]);
  const [clearedFor, setClearedFor] = useState<number | null>(null);

  const lastTs = messages?.length ? messages[messages.length - 1].timestamp : null;
  const suggestedAction = lastTs !== null && clearedFor === lastTs ? null : derived;

  const setSuggestedAction = (value: 'code' | 'draw' | null) => {
    if (value === null && lastTs !== null) {
      setClearedFor(lastTs);
    }
  };

  return { suggestedAction, setSuggestedAction };
}
