import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import * as aiConfigService from '@/services/ai/aiConfigService';
import { TooltipProvider } from '@/components/ui/tooltip';
import ResumeBuilder from './ResumeBuilder';
import { Resume, ResumeData } from '@/types';

// Mock services
vi.mock('@/lib/db');
vi.mock('@/services/ai/aiConfigService');
vi.mock('@/services/resume/resumeAIService');
vi.mock('@/components/shared/SEO', () => ({
  default: () => <></>,
}));
vi.mock('react-joyride', () => ({ default: () => <></> }));

const mockResume: Resume = {
  id: 1,
  fileName: 'Test Resume',
  createdAt: Date.now(),
  rawText: 'This is a test resume.',
  parsedData: {
    basics: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      summary: 'A test summary.',
    },
    work: [{ name: 'Acme', position: 'Dev', startDate: '', endDate: '', summary: '' }],
    education: [],
    skills: [],
    projects: [],
  } as ResumeData,
  formatted: true,
};

describe('ResumeBuilder Integration Test', () => {
  beforeEach(() => {
    vi.mocked(db.resumes.get).mockResolvedValue(mockResume);
    vi.mocked(aiConfigService.getStoredAIConfig).mockReturnValue({
      apiKey: 'test-key',
      provider: 'google',
    });
  });

  it('should load a resume and allow editing', async () => {
    render(
      <MemoryRouter initialEntries={['/resumes/1/edit']}>
        <TooltipProvider>
          <Routes>
            <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    );

    // Wait for the resume to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    // Change the name
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    // The name in the form should be updated
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();

    // Note: asserting the preview update is more complex as it's debounced
    // and requires the entire preview component to be rendered.
    // This basic test verifies the form interaction and state update.
  });
  it('editing the preview never writes back a stale value', async () => {
    // Regression: the preview used to render a 1s-debounced snapshot while
    // itself being the editing surface, so an edit made inside that window
    // persisted the *previous* field value and dropped the newer one.
    vi.mocked(db.resumes.update).mockResolvedValue(1 as never);
    render(
      <MemoryRouter initialEntries={['/resumes/1/edit']}>
        <TooltipProvider>
          <Routes>
            <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));

    // The off-screen export host renders a duplicate preview; the visible one
    // is the last match in document order.
    const editCompany = async (next: string) => {
      const trigger = screen.getAllByText(/^(Acme|Globex)$/).at(-1)!;
      fireEvent.click(trigger);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: next } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };
    const editRole = async (next: string) => {
      const trigger = screen.getAllByText(/^(Dev|Staff Dev)$/).at(-1)!;
      fireEvent.click(trigger);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: next } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    // Wait for the debounced autosave snapshot to be populated, so the preview
    // is genuinely rendering the stale snapshot the regression depends on.
    await waitFor(
      () => {
        expect(vi.mocked(db.resumes.update).mock.calls.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    await editCompany('Globex');
    // Immediately edit another field of the same entry, while the debounced
    // autosave snapshot still holds the original company name.
    await editRole('Staff Dev');
    await waitFor(
      () => {
        const patch = vi.mocked(db.resumes.update).mock.calls.at(-1)?.[1] as
          | { parsedData?: { work?: { name: string }[] } }
          | undefined;
        expect(patch?.parsedData?.work?.[0]?.name).toBe('Globex');
      },
      { timeout: 2000 }
    );
    const lastPatch = vi.mocked(db.resumes.update).mock.calls.at(-1)?.[1] as {
      parsedData?: { work?: { position: string }[] };
    };
    expect(lastPatch.parsedData?.work?.[0]?.position).toBe('Staff Dev');
  });
});
