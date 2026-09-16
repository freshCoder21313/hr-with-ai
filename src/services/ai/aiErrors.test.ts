import { describe, it, expect } from 'vitest';
import { classifyProviderError, AIProviderError } from './aiErrors';

describe('AI Errors Classification', () => {
  it('classifies network errors correctly', () => {
    const error = new Error('Failed to fetch');
    const classified = classifyProviderError(error, 'openai');

    expect(classified.kind).toBe('network');
    expect(classified.retryable).toBe(true);
    expect(classified.fallbackEligible).toBe(true);
  });

  it('classifies 429 as rate limit', () => {
    const error = new Error('Too Many Requests');
    const classified = classifyProviderError(error, 'google', 429);

    expect(classified.kind).toBe('rate_limit');
    expect(classified.retryable).toBe(true);
    expect(classified.fallbackEligible).toBe(true);
  });

  it('classifies 401/403 as auth and not fallback eligible', () => {
    const error = new Error('Unauthorized');
    const classified = classifyProviderError(error, 'anthropic', 401);

    expect(classified.kind).toBe('auth');
    expect(classified.retryable).toBe(false);
    expect(classified.fallbackEligible).toBe(false);
  });

  it('classifies 500 as server error and fallback eligible', () => {
    const error = new Error('Internal Server Error');
    const classified = classifyProviderError(error, 'openai', 500);

    expect(classified.kind).toBe('server');
    expect(classified.retryable).toBe(true);
    expect(classified.fallbackEligible).toBe(true);
  });

  it('classifies 400 as invalid request and not fallback eligible', () => {
    const error = new Error('Bad Request');
    const classified = classifyProviderError(error, 'google', 400);

    expect(classified.kind).toBe('invalid_request');
    expect(classified.retryable).toBe(false);
    expect(classified.fallbackEligible).toBe(false);
  });

  it('preserves existing AIProviderError', () => {
    const original = new AIProviderError('msg', 'auth', 'google', 401, false, false);
    const classified = classifyProviderError(original, 'openai'); // provider arg should be ignored

    expect(classified).toBe(original);
    expect(classified.provider).toBe('google');
  });
});
