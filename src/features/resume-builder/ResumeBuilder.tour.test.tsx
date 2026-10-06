import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import * as aiConfigService from '@/services/ai/aiConfigService';
import { TooltipProvider } from '@/components/ui/tooltip';
import ResumeBuilder from './ResumeBuilder';
import { Resume, ResumeData } from '@/types';
import { TOUR_COMPLETED_KEY } from './hooks/resumeBuilderTour';

// Real react-joyride: this suite proves the close/persist contract end to end,
// so the tour must not be stubbed out here.
vi.mock('@/lib/db');
vi.mock('@/services/ai/aiConfigService');
vi.mock('@/services/resume/resumeAIService');
vi.mock('@/components/shared/SEO', () => ({
  default: () => <></>,
}));

const mockResume: Resume = {
  id: 1,
  fileName: 'Test Resume',
  createdAt: Date.now(),
  rawText: 'This is a test resume.',
  parsedData: {
    basics: { name: 'John Doe', email: 'john.doe@email.com', summary: 'A test summary.' },
    work: [{ name: 'Acme', position: 'Dev', startDate: '', endDate: '', summary: '' }],
    education: [],
    skills: [],
    projects: [],
  } as ResumeData,
  formatted: true,
};

const renderBuilder = () =>
  render(
    <MemoryRouter initialEntries={['/resumes/1/edit']}>
      <TooltipProvider>
        <Routes>
          <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>
  );

const tourButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.react-joyride__tooltip button')).map(
    (button) => button.textContent?.trim() ?? ''
  );

const tourIsOpen = () => document.querySelector('.react-joyride__overlay') !== null;

describe('first-visit tour', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(db.resumes.get).mockResolvedValue(mockResume);
    vi.mocked(aiConfigService.getStoredAIConfig).mockReturnValue({
      apiKey: 'test-key',
      provider: 'google',
    });
  });

  afterEach(() => {
    document.querySelectorAll('.react-floater').forEach((node) => node.remove());
    localStorage.clear();
  });

  it('persists completion and stops when the visitor skips the tour', async () => {
    renderBuilder();

    await waitFor(() => expect(tourIsOpen()).toBe(true), { timeout: 4000 });
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBeNull();

    const skip = tourButtons().findIndex((text) => text.startsWith('Skip'));
    expect(skip).toBeGreaterThanOrEqual(0);

    const skipButton = document.querySelectorAll<HTMLButtonElement>(
      '.react-joyride__tooltip button'
    )[skip];
    await act(async () => {
      fireEvent.click(skipButton);
    });

    await waitFor(() => expect(tourIsOpen()).toBe(false), { timeout: 4000 });
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('true');
  });

  it('persists completion and stops when the visitor presses Escape', async () => {
    renderBuilder();
    await waitFor(() => expect(tourIsOpen()).toBe(true), { timeout: 4000 });

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });

    await waitFor(() => expect(tourIsOpen()).toBe(false), { timeout: 4000 });
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('true');
  });

  it('walks only steps whose targets are on screen and persists on the last one', async () => {
    renderBuilder();
    await waitFor(() => expect(tourIsOpen()).toBe(true), { timeout: 4000 });

    let label = '';
    for (let step = 0; step < 10; step += 1) {
      const advance = tourButtons().find((text) => /^(Next|Last)/.test(text));
      if (!advance) break;
      label = advance;
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        '.react-joyride__tooltip button'
      );
      const target = Array.from(buttons).find(
        (button) => (button.textContent?.trim() ?? '') === advance
      );
      await act(async () => {
        fireEvent.click(target as HTMLButtonElement);
      });
      await act(async () => {
        await Promise.resolve();
      });
      if (label.startsWith('Last')) break;
    }

    await waitFor(() => expect(tourIsOpen()).toBe(false));
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('true');
  });

  it('does not re-open on a later visit once completion is stored', async () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    renderBuilder();

    await screen.findByDisplayValue('John Doe');
    await act(async () => {
      await Promise.resolve();
    });

    expect(tourIsOpen()).toBe(false);
  });
});
