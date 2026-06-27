import { describe, it, expect } from 'vitest';
import { validateResumeBasics } from './resume';

describe('validateResumeBasics', () => {
  it('accepts valid basics with name and email', () => {
    const result = validateResumeBasics({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires a non-empty name', () => {
    const result = validateResumeBasics({ name: '   ', email: '' });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Full name is required');
  });

  it('allows empty email but rejects invalid email when provided', () => {
    expect(validateResumeBasics({ name: 'Jane Doe', email: '' }).isValid).toBe(true);
    expect(validateResumeBasics({ name: 'Jane Doe', email: '   ' }).isValid).toBe(true);

    const invalid = validateResumeBasics({ name: 'Jane Doe', email: 'not-an-email' });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toContain('Please enter a valid email address');
  });
});