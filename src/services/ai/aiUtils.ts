/**
 * Cleans a JSON string by removing markdown code blocks.
 * @param jsonText The raw JSON string from the AI response.
 * @returns A clean JSON string.
 */
export const cleanJsonString = (jsonText: string): string => {
  if (!jsonText) return '';
  return jsonText.replace(/```json\n?|\n?```/g, '').trim();
};

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  retryOnTimeout: boolean;
  retryOnRateLimit: boolean;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  delay: 1000,
  retryOnTimeout: true,
  retryOnRateLimit: true,
};

const isRetryableError = (error: unknown, options: RetryOptions): boolean => {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  if (options.retryOnTimeout && message.includes('timeout')) return true;
  if (options.retryOnRateLimit && message.includes('429')) return true;
  if (message.includes('rate limit')) return true;
  if (message.includes('network') || message.includes('fetch')) return true;
  if (message.includes('failed to fetch')) return true;
  if (message.includes('abort')) return true;

  return false;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> => {
  const opts: RetryOptions = { ...defaultRetryOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries) break;
      if (!isRetryableError(error, opts)) break;

      const delay = opts.delay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
