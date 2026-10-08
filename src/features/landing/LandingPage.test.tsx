import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/lib/db';
import LandingPage from './LandingPage';
import { InterviewStatus } from '@/types';

vi.mock('@/lib/db', () => ({
  db: {
    interviews: {
      count: vi.fn(),
    },
    resumes: {
      count: vi.fn(),
      toArray: vi.fn(),
    },
    skillAssessments: {
      count: vi.fn(),
    },
    getInterviewsPage: vi.fn(),
    getMainCV: vi.fn(),
  },
}));

vi.mock('@/components/shared/SEO', () => ({
  default: () => null,
}));

describe('LandingPage (Hybrid Dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders onboarding hero and features when the user is new (0 interviews and resumes)', async () => {
    vi.mocked(db.interviews.count).mockResolvedValue(0);
    vi.mocked(db.resumes.count).mockResolvedValue(0);
    vi.mocked(db.skillAssessments.count).mockResolvedValue(0);
    vi.mocked(db.getInterviewsPage).mockResolvedValue([]);
    vi.mocked(db.resumes.toArray).mockResolvedValue([]);
    vi.mocked(db.getMainCV).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Master Your/i)).toBeDefined();
    });

    expect(screen.getByText(/How It Works in 3 Steps/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Start Practice Now/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Open CV Studio/i })).toBeDefined();
  });

  it('renders personalized dashboard with recent activity for returning users', async () => {
    vi.mocked(db.interviews.count).mockResolvedValue(3);
    vi.mocked(db.resumes.count).mockResolvedValue(1);
    vi.mocked(db.skillAssessments.count).mockResolvedValue(2);
    vi.mocked(db.getInterviewsPage).mockResolvedValue([
      {
        id: 101,
        company: 'Google',
        jobTitle: 'Senior Frontend Engineer',
        createdAt: Date.now() - 3600000,
        status: InterviewStatus.COMPLETED,
        messages: [],
        feedback: {
          score: 8.5,
          summary: 'Great performance',
          strengths: [],
          weaknesses: [],
        },
      } as any,
    ]);
    vi.mocked(db.resumes.toArray).mockResolvedValue([
      {
        id: 1,
        fileName: 'My_Resume.pdf',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isMain: true,
      } as any,
    ]);
    vi.mocked(db.getMainCV).mockResolvedValue({
      id: 1,
      fileName: 'My_Resume.pdf',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isMain: true,
    } as any);

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeDefined();
    });

    expect(screen.getByText(/Quick Actions/i)).toBeDefined();
    expect(screen.getByText(/Recent Sessions/i)).toBeDefined();
    expect(screen.getByText('Senior Frontend Engineer')).toBeDefined();
    expect(screen.getByText('Google')).toBeDefined();
    expect(screen.getAllByText('8.5/10').length).toBeGreaterThan(0);
  });

  it('highlights in-progress interview when user has an unfinished session', async () => {
    vi.mocked(db.interviews.count).mockResolvedValue(1);
    vi.mocked(db.resumes.count).mockResolvedValue(0);
    vi.mocked(db.skillAssessments.count).mockResolvedValue(0);
    vi.mocked(db.getInterviewsPage).mockResolvedValue([
      {
        id: 202,
        company: 'Amazon',
        jobTitle: 'Solutions Architect',
        createdAt: Date.now() - 1800000,
        status: InterviewStatus.IN_PROGRESS,
        messages: [{ role: 'user', content: 'Hi', timestamp: Date.now() }],
      } as any,
    ]);
    vi.mocked(db.resumes.toArray).mockResolvedValue([]);
    vi.mocked(db.getMainCV).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/In Progress Session/i)).toBeDefined();
    });

    expect(screen.getByText('Solutions Architect at Amazon')).toBeDefined();
    expect(screen.getByRole('button', { name: /Resume Interview/i })).toBeDefined();
  });
});
