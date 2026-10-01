import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/db', () => ({
  db: { cleanOldResumes: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/features/settings/ApiKeyModal', () => ({
  default: () => null,
}));

vi.mock('@/components/shared/theme-toggle', () => ({
  ThemeToggle: () => null,
}));

vi.mock('@/components/shared/CloudSyncModal', () => ({
  CloudSyncModal: () => null,
}));

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn().mockResolvedValue({
    hintsEnabled: false,
    autoFinishEnabled: false,
    forceToolsEnabled: false,
    apiKey: '',
    baseUrl: '',
    defaultModel: 'gemini-2.5-pro',
    maxRetries: 3,
    retryDelay: 1000,
    retryOnTimeout: true,
    retryOnRateLimit: true,
  }),
  saveUserSettings: vi.fn(),
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/dashboard/SetupRoom', () => ({ default: () => <div data-testid="page" /> }));
vi.mock('@/features/interview/InterviewRoom', () => ({
  default: () => <div data-testid="page" />,
}));
vi.mock('@/features/interview/FeedbackView', () => ({ default: () => <div data-testid="page" /> }));
vi.mock('@/features/resume-builder/ResumeBuilder', () => ({
  default: () => <div data-testid="page" />,
}));
vi.mock('@/features/cv-studio/CVStudioPage', () => ({ default: () => <div data-testid="page" /> }));
vi.mock('@/features/landing/LandingPage', () => ({ default: () => <div data-testid="page" /> }));
vi.mock('@/features/history/HistoryPage', () => ({ default: () => <div data-testid="page" /> }));
vi.mock('@/features/skill-assessment/SkillAssessmentPage', () => ({
  default: () => <div data-testid="page" />,
}));

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

import App from './App';

describe('App settings access', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('opens the preference Settings modal from the header outside the interview room', async () => {
    render(<App />);

    // Landing page stub is mounted — no interview room involved.
    expect(await screen.findByTestId('page')).toBeDefined();
    expect(screen.queryByText('AI Interview Hints')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await waitFor(() => expect(screen.getByText('AI Interview Hints')).toBeDefined());
    expect(screen.getByText('AI Auto-Finish')).toBeDefined();
    expect(screen.getByText('Force AI Tools (Code/Draw)')).toBeDefined();
  });

  it('keeps a route to AI provider profiles / API keys from settings', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await waitFor(() => expect(screen.getByText('AI Provider Profiles')).toBeDefined());
    expect(screen.getByRole('button', { name: 'Manage AI Profiles' })).toBeDefined();
  });
});
