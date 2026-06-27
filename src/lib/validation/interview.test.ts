import { describe, it, expect } from 'vitest';
import { validateInterviewSetup } from './interview';

describe('validateInterviewSetup', () => {
  it('accepts complete setup form data', () => {
    const result = validateInterviewSetup({
      jobTitle: 'Software Engineer',
      company: 'Tech Corp',
      interviewerPersona: 'Strict engineering manager',
      resumeText: 'Experienced developer with 5 years...',
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports missing required fields', () => {
    const result = validateInterviewSetup({});

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Job title is required');
    expect(result.errors).toContain('Company is required');
    expect(result.errors).toContain('Interviewer persona is required');
    expect(result.errors).toContain('Resume text is required');
  });

  it('rejects whitespace-only required fields', () => {
    const result = validateInterviewSetup({
      jobTitle: '   ',
      company: '   ',
      interviewerPersona: '   ',
      resumeText: '   ',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });
});