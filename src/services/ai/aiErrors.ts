import { AIModelProvider } from '@/types';

export type AIProviderErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'server'
  | 'auth'
  | 'invalid_request'
  | 'not_found'
  | 'unknown';

export class AIProviderError extends Error {
  constructor(
    public message: string,
    public kind: AIProviderErrorKind,
    public provider: AIModelProvider,
    public status?: number,
    public retryable: boolean = false,
    public fallbackEligible: boolean = false,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIStructuredOutputError extends Error {
  constructor(
    public message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AIStructuredOutputError';
  }
}

export const sanitizeAIErrorMessage = (message: string): string => {
  if (!message) return 'Unknown provider error';

  // Remove likely keys/tokens
  // - AIza... (Google)
  // - sk-... (OpenAI)
  // - Bearer ...
  // - key=... query param
  let sanitized = message
    .replace(/AIza[a-zA-Z0-9\-_]{35}/g, '[REDACTED_KEY]')
    .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/key=[a-zA-Z0-9\-_]+/gi, 'key=[REDACTED_KEY]');

  // Cap length to avoid massive logs/UI blowups
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  return sanitized;
};

export const classifyProviderError = (
  error: unknown,
  provider: AIModelProvider,
  status?: number
): AIProviderError => {
  if (error instanceof AIProviderError) return error;

  let kind: AIProviderErrorKind = 'unknown';
  let retryable = false;
  let fallbackEligible = false;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = sanitizeAIErrorMessage(rawMessage);

  const lowerMessage = rawMessage.toLowerCase();

  // Network/Timeout classification from Error message
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('failed to fetch')
  ) {
    kind = 'network';
    retryable = true;
    fallbackEligible = true;
  } else if (lowerMessage.includes('timeout') || lowerMessage.includes('abort')) {
    kind = 'timeout';
    retryable = true;
    fallbackEligible = true;
  }

  // Status code based classification (overrides or refines kind)
  if (status) {
    if (status === 429) {
      kind = 'rate_limit';
      retryable = true;
      fallbackEligible = true;
    } else if (status === 408) {
      kind = 'timeout';
      retryable = true;
      fallbackEligible = true;
    } else if (status === 401 || status === 403) {
      kind = 'auth';
      retryable = false;
      fallbackEligible = false;
    } else if (status === 404) {
      kind = 'not_found';
      retryable = false;
      fallbackEligible = false;
    } else if (status === 400 || status === 422) {
      kind = 'invalid_request';
      retryable = false;
      fallbackEligible = false;
    } else if (status >= 500) {
      kind = 'server';
      retryable = true;
      fallbackEligible = true;
    }
  }

  return new AIProviderError(message, kind, provider, status, retryable, fallbackEligible, error);
};
