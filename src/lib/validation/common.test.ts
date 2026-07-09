import { describe, it, expect } from 'vitest';
import { isNonEmptyString, isValidEmail } from './common';

describe('isValidEmail', () => {
  it('accepts standard email addresses', () => {
    expect(isValidEmail('john.doe@email.com')).toBe(true);
    expect(isValidEmail('user@example.org')).toBe(true);
    expect(isValidEmail('a+b@c.co')).toBe(true);
  });

  it('rejects empty or whitespace-only values', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@missing-local.com')).toBe(false);
    expect(isValidEmail('missing-domain@')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

describe('isNonEmptyString', () => {
  it('returns true for strings with non-whitespace content', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('  hello  ')).toBe(true);
  });

  it('returns false for empty, whitespace-only, null, or undefined', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
});
