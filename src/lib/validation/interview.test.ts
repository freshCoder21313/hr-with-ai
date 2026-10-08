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

  it('rejects pure numbers in job title and company', () => {
    const result = validateInterviewSetup({
      jobTitle: '12345',
      company: '99999',
      interviewerPersona: 'Strict engineering manager',
      resumeText: 'Experienced developer',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Job title must contain valid text characters');
    expect(result.errors).toContain('Company must contain valid text characters');
  });

  it('rejects only special characters in job title and company', () => {
    const result = validateInterviewSetup({
      jobTitle: '!@#$%',
      company: '---***+++',
      interviewerPersona: 'Strict engineering manager',
      resumeText: 'Experienced developer',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Job title must contain valid text characters');
    expect(result.errors).toContain('Company must contain valid text characters');
  });

  it('accepts job title and company containing letters with numbers, symbols, and Unicode', () => {
    const result = validateInterviewSetup({
      jobTitle: 'Web3 Engineer (Level 2)',
      company: '7-Eleven Việt Nam',
      interviewerPersona: 'Strict engineering manager',
      resumeText: 'Experienced developer with 5 years...',
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
