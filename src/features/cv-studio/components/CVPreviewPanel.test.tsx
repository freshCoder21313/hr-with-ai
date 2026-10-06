import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CVPreviewPanel } from './CVPreviewPanel';
import type { Resume } from '@/types';
import type { ResumeData } from '@/types/resume';

const mockResumeData: ResumeData = {
  basics: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    summary: 'Full-stack software engineer',
  },
  work: [
    {
      name: 'Tech Corp',
      position: 'Frontend Engineer',
      startDate: '2022-01',
      highlights: ['Built interactive dashboards'],
    },
  ],
  education: [],
  skills: [],
  projects: [],
};

const mockResume: Resume = {
  id: 42,
  fileName: 'Jane_Doe_Resume.pdf',
  createdAt: Date.now(),
  rawText: 'Resume text',
  parsedData: mockResumeData,
  formatted: true,
};

describe('CVPreviewPanel Focus Mode & Toolbar', () => {
  it('renders Focus Mode button and triggers onOpenFullEditor when clicked', () => {
    const onOpenFullEditor = vi.fn();
    const onSetPreviewViewMode = vi.fn();
    const onSetTemplate = vi.fn();
    const onSetActiveTab = vi.fn();
    const onManualUpdate = vi.fn();
    const onOpenReorderDialog = vi.fn();
    const onPrint = vi.fn();

    render(
      <TooltipProvider>
        <CVPreviewPanel
          previewData={mockResumeData}
          template="modern"
          previewViewMode="preview"
          activeTab="basics"
          mainCV={mockResume}
          onSetPreviewViewMode={onSetPreviewViewMode}
          onSetTemplate={onSetTemplate}
          onSetActiveTab={onSetActiveTab}
          onManualUpdate={onManualUpdate}
          onOpenReorderDialog={onOpenReorderDialog}
          onPrint={onPrint}
          onOpenFullEditor={onOpenFullEditor}
        />
      </TooltipProvider>
    );

    const focusButton = screen.getByRole('button', { name: /open focus mode/i });
    expect(focusButton).toBeInTheDocument();
    expect(focusButton).not.toBeDisabled();

    fireEvent.click(focusButton);
    expect(onOpenFullEditor).toHaveBeenCalledTimes(1);
  });

  it('switches preview view modes when clicking toolbar mode buttons', () => {
    const onSetPreviewViewMode = vi.fn();

    render(
      <TooltipProvider>
        <CVPreviewPanel
          previewData={mockResumeData}
          template="modern"
          previewViewMode="preview"
          activeTab="basics"
          mainCV={mockResume}
          onSetPreviewViewMode={onSetPreviewViewMode}
          onSetTemplate={vi.fn()}
          onSetActiveTab={vi.fn()}
          onManualUpdate={vi.fn()}
          onOpenReorderDialog={vi.fn()}
          onPrint={vi.fn()}
        />
      </TooltipProvider>
    );

    const formButton = screen.getByRole('button', { name: /form/i });
    fireEvent.click(formButton);
    expect(onSetPreviewViewMode).toHaveBeenCalledWith('form');

    const splitButton = screen.getByRole('button', { name: /split/i });
    fireEvent.click(splitButton);
    expect(onSetPreviewViewMode).toHaveBeenCalledWith('split');
  });

  it('triggers onSetActiveTab when clicking section tabs in form mode', () => {
    const onSetActiveTab = vi.fn();

    render(
      <TooltipProvider>
        <CVPreviewPanel
          previewData={mockResumeData}
          template="modern"
          previewViewMode="form"
          activeTab="basics"
          mainCV={mockResume}
          onSetPreviewViewMode={vi.fn()}
          onSetTemplate={vi.fn()}
          onSetActiveTab={onSetActiveTab}
          onManualUpdate={vi.fn()}
          onOpenReorderDialog={vi.fn()}
          onPrint={vi.fn()}
        />
      </TooltipProvider>
    );

    const workTab = screen.getByRole('button', { name: /work/i });
    expect(workTab).toBeInTheDocument();
    fireEvent.click(workTab);
    expect(onSetActiveTab).toHaveBeenCalledWith('work');

    const skillsTab = screen.getByRole('button', { name: /skills/i });
    fireEvent.click(skillsTab);
    expect(onSetActiveTab).toHaveBeenCalledWith('skills');
  });
});

