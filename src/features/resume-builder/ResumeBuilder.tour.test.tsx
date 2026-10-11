import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import * as aiConfigService from '@/services/ai/aiConfigService';
import { TooltipProvider } from '@/components/ui/tooltip';
import ResumeBuilder from './ResumeBuilder';
import { GlobalTourOverlay } from '@/components/tour/GlobalTourOverlay';
import { Resume, ResumeData } from '@/types';
import { useTourStore } from '@/services/tour/tourStore';

const driveMock = vi.fn();
const destroyMock = vi.fn();

vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({
    isActive: () => true,
    drive: driveMock,
    destroy: destroyMock,
    setConfig: vi.fn(),
    setSteps: vi.fn(),
    getConfig: vi.fn(),
    getState: vi.fn(),
    getActiveIndex: vi.fn(),
    isFirstStep: vi.fn(),
    isLastStep: vi.fn(),
    getActiveStep: vi.fn(),
    getActiveElement: vi.fn(),
    getPreviousElement: vi.fn(),
    getPreviousStep: vi.fn(),
    getNextStep: vi.fn(),
    moveNext: vi.fn(),
    movePrevious: vi.fn(),
    moveTo: vi.fn(),
    hasNextStep: vi.fn(),
    hasPreviousStep: vi.fn(),
    highlight: vi.fn(),
    refresh: vi.fn(),
  })),
}));

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

const renderBuilderWithTour = () =>
  render(
    <MemoryRouter initialEntries={['/resumes/1/edit']}>
      <TooltipProvider>
        <GlobalTourOverlay />
        <Routes>
          <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>
  );

describe('ResumeBuilder tour integration with driver.js', () => {
  beforeEach(() => {
    localStorage.clear();
    useTourStore.getState().resetAllTours();
    driveMock.mockClear();
    destroyMock.mockClear();
    vi.mocked(db.resumes.get).mockResolvedValue(mockResume);
    vi.mocked(aiConfigService.getStoredAIConfig).mockReturnValue({
      apiKey: 'test-key',
      provider: 'google',
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('triggers driver tour automatically on route entry when not completed', async () => {
    renderBuilderWithTour();

    await screen.findByDisplayValue('John Doe');

    await waitFor(
      () => {
        expect(useTourStore.getState().isRunning).toBe(true);
        expect(useTourStore.getState().activeTourId).toBe('tour_builder');
        expect(driveMock).toHaveBeenCalled();
      },
      { timeout: 4000 }
    );
  });

  it('does not re-open tour once tour_builder is marked completed in store', async () => {
    useTourStore.getState().completeTour('tour_builder');

    renderBuilderWithTour();

    await screen.findByDisplayValue('John Doe');

    // Wait past timer duration to confirm driver is not called
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(driveMock).not.toHaveBeenCalled();
    expect(useTourStore.getState().isRunning).toBe(false);
  });
});
