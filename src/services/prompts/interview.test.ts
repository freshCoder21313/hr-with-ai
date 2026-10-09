import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from './interview';
import { Interview, InterviewStatus } from '@/types';

describe('getSystemPrompt - dynamic scenarios and conversational rules', () => {
  const baseInterview: Interview = {
    id: 1,
    createdAt: Date.now(),
    jobTitle: 'Backend Engineer',
    company: 'Fintech Hub',
    status: InterviewStatus.IN_PROGRESS,
    messages: [],
    interviewerPersona: 'Strict Tech Lead',
    jobDescription: 'Go, distributed systems, high scale',
    resumeText: 'Experience in distributed systems and cloud architecture',
    language: 'en-US',
  };

  it('enforces strict one question at a time rule in baseline prompt', () => {
    const prompt = getSystemPrompt(baseInterview, false, false);
    expect(prompt).toContain('One Question at a Time (STRICT)');
    expect(prompt).toContain('Under NO circumstances should you combine a follow-up inquiry about a previous point with a new curveball');
  });

  it('omits ADAPTIVE WORKPLACE CHALLENGE PROTOCOL when dynamicScenariosEnabled is false', () => {
    const prompt = getSystemPrompt(baseInterview, false, false, undefined, false);
    expect(prompt).not.toContain('ADAPTIVE WORKPLACE CHALLENGE PROTOCOL');
  });

  it('includes ADAPTIVE WORKPLACE CHALLENGE PROTOCOL when dynamicScenariosEnabled is true', () => {
    const prompt = getSystemPrompt(baseInterview, false, false, undefined, true);
    expect(prompt).toContain('ADAPTIVE WORKPLACE CHALLENGE PROTOCOL (DYNAMIC SCENARIOS ENABLED)');
    expect(prompt).toContain('Context Readiness & Self-Check');
    expect(prompt).toContain('CRITICAL GUARDRAIL: If the candidate is currently explaining their resume history');
    expect(prompt).toContain('Conversational Discipline (ZERO DOUBLE QUESTIONS)');
    expect(prompt).toContain('BANNED CLICHÉS: NEVER use robotic or forced transition phrases');
  });

  it('reads dynamicScenariosEnabled directly from the interview object if omitted from parameters', () => {
    const interviewWithScenarios: Interview = {
      ...baseInterview,
      dynamicScenariosEnabled: true,
    };
    const prompt = getSystemPrompt(interviewWithScenarios, false, false);
    expect(prompt).toContain('ADAPTIVE WORKPLACE CHALLENGE PROTOCOL (DYNAMIC SCENARIOS ENABLED)');
  });

  it('enforces Candidate Project Authority & Anti-Dogmatism rules in system prompt', () => {
    const prompt = getSystemPrompt(baseInterview, false, false);
    expect(prompt).toContain('CANDIDATE PROFILE (SOURCE OF TRUTH & CREATOR AUTHORITY)');
    expect(prompt).toContain('The candidate is the creator, architect, and ultimate authority');
    expect(prompt).toContain('Candidate Project Authority & Anti-Dogmatism (CRITICAL)');
    expect(prompt).toContain('Never Presume Contradiction or Lecture the Creator');
    expect(prompt).toContain('Accept Candidate Explanations (No Internet Arguing)');
    expect(prompt).toContain('Banned Patronizing Phrases & Demeanor');
  });
});

