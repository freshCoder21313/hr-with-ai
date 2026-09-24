import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { db } from '@/lib/db';
import { Interview, InterviewStatus } from '@/types';
import HistoryPage from './HistoryPage';

vi.mock('@/lib/db', () => ({
  db: {
    getInterviewsPage: vi.fn(),
  },
}));

vi.mock('@/components/shared/SEO', () => ({ default: () => <></> }));
vi.mock('./ProgressCharts', () => ({ default: () => <></> }));
vi.mock('./SkillRadarChart', () => ({ default: () => <></> }));
vi.mock('./LearningPath', () => ({ default: () => <></> }));
vi.mock('./components/ShareModal', () => ({
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const makeInterview = (i: number): Interview => ({
  id: i,
  createdAt: Date.now() - i * 1000,
  company: `Company ${i}`,
  jobTitle: 'Engineer',
  interviewerPersona: 'Neutral',
  jobDescription: 'JD',
  resumeText: 'Resume',
  language: 'en-US',
  status: InterviewStatus.COMPLETED,
  messages: [],
  feedback: {
    score: 8,
    summary: '',
    strengths: [],
    weaknesses: [],
    keyQuestionAnalysis: [],
    mermaidGraphCurrent: '',
    mermaidGraphPotential: '',
    recommendedResources: [],
  },
});

const fixture: Interview[] = Array.from({ length: 45 }, (_, i) => makeInterview(i + 1));

const renderPage = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <HistoryPage />
      </TooltipProvider>
    </MemoryRouter>
  );

describe('HistoryPage pagination', () => {
  beforeEach(() => {
    vi.mocked(db.getInterviewsPage).mockImplementation((offset: number, limit: number) =>
      Promise.resolve(fixture.slice(offset, offset + limit))
    );
  });

  it('loads pages of 20 and stops when exhausted', async () => {
    renderPage();

    // Initial page: 20 items + a Load more button.
    await waitFor(() => expect(screen.getAllByText('Share')).toHaveLength(20));
    expect(screen.getByText('Load more')).toBeInTheDocument();

    // Second page → 40.
    fireEvent.click(screen.getByText('Load more'));
    await waitFor(() => expect(screen.getAllByText('Share')).toHaveLength(40));
    expect(screen.getByText('Load more')).toBeInTheDocument();

    // Final page → 45, no more pages.
    fireEvent.click(screen.getByText('Load more'));
    await waitFor(() => expect(screen.getAllByText('Share')).toHaveLength(45));
    expect(screen.queryByText('Load more')).toBeNull();
  });
});
