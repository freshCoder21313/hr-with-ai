import { describe, it, expect } from 'vitest';
import { getFeedbackPrompt } from './feedback';
import { Interview, InterviewStatus } from '@/types';

describe('getFeedbackPrompt - evaluation fairness', () => {
  const baseInterview: Interview = {
    id: 1,
    createdAt: Date.now(),
    jobTitle: 'Senior Fullstack Engineer',
    company: 'TechCorp',
    status: InterviewStatus.COMPLETED,
    messages: [],
    interviewerPersona: 'Strict Tech Lead',
    jobDescription: 'React, Node.js, distributed systems',
    resumeText: 'Experience in fullstack architecture',
    language: 'vi-VN',
  };

  it('includes EVALUATION FAIRNESS & ARCHITECTURAL OBJECTIVITY guidelines', () => {
    const prompt = getFeedbackPrompt(baseInterview, 'User: ...', '');
    expect(prompt).toContain('EVALUATION FAIRNESS & ARCHITECTURAL OBJECTIVITY');
    expect(prompt).toContain('The candidate is the creator and authoritative source of truth');
    expect(prompt).toContain('evaluate the candidate\'s response on its actual technical soundness');
    expect(prompt).toContain('NEVER penalize a candidate simply for holding their ground');
  });

  it('includes MODE & ARTIFACT AWARENESS guidelines with interview format', () => {
    const prompt = getFeedbackPrompt({ ...baseInterview, type: 'system_design' }, 'User: ...', '');
    expect(prompt).toContain('Interview Format: system_design');
    expect(prompt).toContain('MODE & ARTIFACT AWARENESS (STRICT)');
    expect(prompt).toContain('DO NOT penalize the candidate for missing, incomplete, or absent code');
    expect(prompt).toContain('Do NOT hallucinate code expectations or deduct points for "not writing code"');
  });
});
