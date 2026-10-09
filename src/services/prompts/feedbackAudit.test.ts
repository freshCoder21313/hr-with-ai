import { describe, it, expect } from 'vitest';
import { getFeedbackAuditPrompt } from './feedbackAudit';
import { Interview, InterviewFeedback, InterviewStatus } from '@/types';

describe('getFeedbackAuditPrompt', () => {
  const baseInterview: Interview = {
    id: 1,
    createdAt: Date.now(),
    jobTitle: 'Senior Fullstack Engineer',
    company: 'Flexspace Technologies',
    status: InterviewStatus.COMPLETED,
    messages: [],
    interviewerPersona: 'Strict Tech Lead',
    jobDescription: 'System design, OCC, React',
    resumeText: 'Offline-first architecture experience',
    language: 'vi-VN',
    type: 'system_design',
  };

  const draftFeedback: InterviewFeedback = {
    score: 4.5,
    technicalScore: 4.0,
    communicationScore: 6.0,
    summary: 'Candidate did not write code.',
    strengths: ['Understands OCC'],
    weaknesses: ['Did not write code in editor'],
    keyQuestionAnalysis: [
      {
        question: 'How to handle offline sync?',
        analysis: 'Explained well but no code provided.',
        improvement: 'Write code.',
      },
    ],
    mermaidGraphCurrent: 'graph TD\nA-->B',
    mermaidGraphPotential: 'graph TD\nA-->C',
    recommendedResources: [],
  };

  it('includes core audit instructions, phantom penalty eradication, and draft JSON', () => {
    const prompt = getFeedbackAuditPrompt(
      baseInterview,
      'Interviewer: Design offline sync\nCandidate: We use OCC and IndexedDB',
      'CODE SUBMISSION: None.',
      draftFeedback
    );

    expect(prompt).toContain('Executive Interview Evaluation Auditor');
    expect(prompt).toContain('Interview Format: system_design');
    expect(prompt).toContain('CANDIDATE PROJECT & ARCHITECTURAL AUTHORITY');
    expect(prompt).toContain('MODE & ARTIFACT AWARENESS (ELIMINATE PHANTOM PENALTIES)');
    expect(prompt).toContain('SCORE & CRITIQUE HARMONY');
    expect(prompt).toContain('"Candidate did not write code."');
  });
});
