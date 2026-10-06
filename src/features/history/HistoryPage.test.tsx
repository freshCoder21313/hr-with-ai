import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { db } from '@/lib/db';
import { notificationService } from '@/services/core/notificationService';
import { Interview, InterviewStatus, SkillAssessmentRecord } from '@/types';
import HistoryPage from './HistoryPage';

vi.mock('@/lib/db', () => ({
  db: {
    getInterviewsPage: vi.fn(),
    interviews: {
      count: vi.fn(),
      delete: vi.fn(),
    },
    skillAssessments: {
      orderBy: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: {
    confirm: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/shared/SEO', () => ({ default: () => <></> }));
vi.mock('./ProgressCharts', () => ({ default: () => <></> }));
vi.mock('./SkillRadarChart', () => ({ default: () => <></> }));
vi.mock('./LearningPath', () => ({ default: () => <></> }));
vi.mock('./components/ShareModal', () => ({
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const mockInterviews: Interview[] = [
  {
    id: 1,
    createdAt: 1700000000000,
    company: 'Acme Corp',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona: 'Neutral',
    jobDescription: 'JD',
    resumeText: 'Resume',
    language: 'en-US',
    status: InterviewStatus.COMPLETED,
    messages: [],
    feedback: {
      score: 8.5,
      summary: 'Great performance',
      strengths: ['React'],
      weaknesses: ['CSS'],
      keyQuestionAnalysis: [],
      mermaidGraphCurrent: '',
      mermaidGraphPotential: '',
      recommendedResources: [],
    },
  },
  {
    id: 2,
    createdAt: 1700000500000,
    company: 'Globex Inc',
    jobTitle: 'Backend Developer',
    interviewerPersona: 'Neutral',
    jobDescription: 'JD',
    resumeText: 'Resume',
    language: 'en-US',
    status: InterviewStatus.COMPLETED,
    messages: [],
    feedback: {
      score: 7,
      summary: 'Solid backend skills',
      strengths: ['Node'],
      weaknesses: ['SQL'],
      keyQuestionAnalysis: [],
      mermaidGraphCurrent: '',
      mermaidGraphPotential: '',
      recommendedResources: [],
    },
  },
];

const mockSkillAssessments: SkillAssessmentRecord[] = [
  {
    id: 101,
    skill: 'React Architecture',
    score: 85,
    totalQuestions: 10,
    weaknesses: [],
    createdAt: 1700001000000,
  },
  {
    id: 102,
    skill: 'Node.js Performance',
    score: 60,
    totalQuestions: 5,
    weaknesses: ['Event Loop', 'Streams'],
    createdAt: 1700002000000,
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <HistoryPage />
      </TooltipProvider>
    </MemoryRouter>
  );

describe('HistoryPage Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getInterviewsPage).mockResolvedValue(mockInterviews);
    vi.mocked(db.interviews.count).mockResolvedValue(mockInterviews.length);
    vi.mocked(db.interviews.delete).mockResolvedValue(undefined as never);

    const reverseMock = {
      toArray: vi.fn().mockResolvedValue(mockSkillAssessments),
    };
    vi.mocked(db.skillAssessments.orderBy).mockReturnValue({
      reverse: vi.fn().mockReturnValue(reverseMock),
    } as never);
    vi.mocked(db.skillAssessments.delete).mockResolvedValue(undefined as never);
  });

  it('renders interview list and allows filtering by company or job title', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Globex Inc')).toBeInTheDocument();
    });

    // Filter by company
    const searchInput = screen.getByPlaceholderText('Search by company or job title...');
    fireEvent.change(searchInput, { target: { value: 'Acme' } });

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();

    // Filter by job title
    fireEvent.change(searchInput, { target: { value: 'Backend' } });
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();
  });

  it('prompts confirmation and deletes an interview session', async () => {
    vi.mocked(notificationService.confirm).mockResolvedValue(true);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete interview');
    fireEvent.click(deleteButtons[0]);

    expect(notificationService.confirm).toHaveBeenCalledWith({
      title: 'Delete Interview',
      message: 'Are you sure you want to delete this interview session?',
      variant: 'destructive',
    });

    await waitFor(() => {
      expect(db.interviews.delete).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    });
  });

  it('does not delete interview if confirmation is cancelled', async () => {
    vi.mocked(notificationService.confirm).mockResolvedValue(false);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete interview');
    fireEvent.click(deleteButtons[0]);

    expect(notificationService.confirm).toHaveBeenCalled();
    expect(db.interviews.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('switches to Skill Assessments tab, fetches assessments and displays details', async () => {
    renderPage();

    const assessmentsTab = screen.getByRole('tab', { name: /skill assessments/i });
    fireEvent.click(assessmentsTab);

    await waitFor(() => {
      expect(screen.getByText('React Architecture')).toBeInTheDocument();
      expect(screen.getByText('Node.js Performance')).toBeInTheDocument();
    });

    // Score badges
    expect(screen.getByText('Score: 85%')).toBeInTheDocument();
    expect(screen.getByText('Score: 60%')).toBeInTheDocument();

    // Weaknesses
    expect(screen.getByText('Event Loop')).toBeInTheDocument();
    expect(screen.getByText('Streams')).toBeInTheDocument();
    expect(screen.getByText('No weak areas identified — excellent work!')).toBeInTheDocument();
  });

  it('deletes a skill assessment upon confirmation', async () => {
    vi.mocked(notificationService.confirm).mockResolvedValue(true);
    renderPage();

    const assessmentsTab = screen.getByRole('tab', { name: /skill assessments/i });
    fireEvent.click(assessmentsTab);

    await waitFor(() => {
      expect(screen.getByText('React Architecture')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete skill assessment');
    fireEvent.click(deleteButtons[0]);

    expect(notificationService.confirm).toHaveBeenCalledWith({
      title: 'Delete Assessment',
      message: 'Are you sure you want to delete this skill assessment record?',
      variant: 'destructive',
    });

    await waitFor(() => {
      expect(db.skillAssessments.delete).toHaveBeenCalledWith(101);
      expect(screen.queryByText('React Architecture')).not.toBeInTheDocument();
    });
  });

  it('filters skill assessments by skill name', async () => {
    renderPage();

    const assessmentsTab = screen.getByRole('tab', { name: /skill assessments/i });
    fireEvent.click(assessmentsTab);

    await waitFor(() => {
      expect(screen.getByText('React Architecture')).toBeInTheDocument();
      expect(screen.getByText('Node.js Performance')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by skill name...');
    fireEvent.change(searchInput, { target: { value: 'Node' } });

    expect(screen.queryByText('React Architecture')).not.toBeInTheDocument();
    expect(screen.getByText('Node.js Performance')).toBeInTheDocument();
  });
});
