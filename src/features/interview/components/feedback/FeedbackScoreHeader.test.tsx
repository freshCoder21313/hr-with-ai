import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FeedbackScoreHeader } from './FeedbackScoreHeader';
import { buildRadarData } from './radarData';
import { Interview, InterviewFeedback, InterviewStatus } from '@/types';

const feedback: InterviewFeedback = {
  score: 7,
  summary: 'ok',
  strengths: [],
  weaknesses: [],
  keyQuestionAnalysis: [],
  mermaidGraphCurrent: '',
  mermaidGraphPotential: '',
  recommendedResources: [],
};

const interview: Interview = {
  id: 1,
  createdAt: Date.now(),
  jobTitle: 'Engineer',
  company: 'Acme',
  status: InterviewStatus.COMPLETED,
  messages: [],
  interviewerPersona: 'p',
  jobDescription: 'd',
  resumeText: 'r',
  language: 'en-US',
};

describe('buildRadarData', () => {
  it('plots only the axes that carry a real score', () => {
    const axes = buildRadarData({ ...feedback, score: 8, cultureFitScore: 6 });
    expect(axes).toEqual([
      { subject: 'Overall', A: 8, fullMark: 10 },
      { subject: 'Culture Fit', A: 6, fullMark: 10 },
    ]);
    expect(axes.some((a) => a.subject === 'Resilience')).toBe(false);
  });

  it('keeps a zero score but drops undefined scores', () => {
    const axes = buildRadarData({ ...feedback, cultureFitScore: 0, resilienceScore: undefined });
    expect(axes).toEqual([
      { subject: 'Overall', A: 7, fullMark: 10 },
      { subject: 'Culture Fit', A: 0, fullMark: 10 },
    ]);
  });

  it('never derives a Comm or Problem Solving axis from the overall score', () => {
    const axes = buildRadarData({ ...feedback, score: 9 });
    expect(axes.map((a) => a.subject)).toEqual(['Overall']);
  });
});

describe('FeedbackScoreHeader radar', () => {
  it('renders no chart when fewer than three dimensions are scored', () => {
    render(<FeedbackScoreHeader interview={interview} feedback={feedback} />);
    expect(screen.queryByTestId('feedback-radar')).not.toBeInTheDocument();
    expect(screen.getByText(/Not enough scored dimensions/)).toBeInTheDocument();
  });

  it('renders the chart when at least three dimensions are scored', () => {
    render(
      <FeedbackScoreHeader
        interview={interview}
        feedback={{ ...feedback, cultureFitScore: 6, resilienceScore: 5 }}
      />
    );
    expect(screen.getByTestId('feedback-radar')).toBeInTheDocument();
  });
});
