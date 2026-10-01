import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CVJobPanel } from './CVJobPanel';
import { useJobStore, Job } from '../stores/useJobStore';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Resume } from '@/types';

const mockResumes: Resume[] = [
  {
    id: 1,
    fileName: 'My_Resume.pdf',
    rawText: 'Resume text',
    isMain: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const mockJobs: Job[] = [
  {
    id: 'job-1',
    company: 'Tech Co',
    title: 'Frontend Lead',
    description: 'Lead description',
    customPrompt: '',
  },
];

describe('CVJobPanel', () => {
  beforeEach(() => {
    useJobStore.setState({ jobs: mockJobs, globalPrompt: 'default prompt' });
  });

  const defaultProps = {
    jobs: mockJobs,
    selectedResumeId: 1,
    selectedJobs: new Set<string>(['job-1']),
    isJobPanelOpen: true,
    isProcessing: false,
    progress: 0,
    resumes: mockResumes,
    processingStatus: {},
    onAddJob: vi.fn(),
    onRemoveJob: vi.fn(),
    onUpdateJob: vi.fn(),
    onExportJobs: vi.fn(),
    onImportJobs: vi.fn(),
    onStartTailoring: vi.fn(),
    onSelectResume: vi.fn(),
    onRenameResume: vi.fn(),
    onToggleJobSelection: vi.fn(),
    onTogglePanel: vi.fn(),
    onOpenPromptModal: vi.fn(),
    onViewResult: vi.fn(),
    onReTailorJob: vi.fn(),
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders Auto-fill JD button in the toolbar', () => {
    renderWithProviders(<CVJobPanel {...defaultProps} />);

    const autoFillBtn = screen.getByRole('button', { name: /Auto-fill JD/i });
    expect(autoFillBtn).toBeInTheDocument();
  });

  it('opens SmartJDImportModal when clicking Auto-fill JD button', () => {
    const onOpenSmartJDModal = vi.fn();
    renderWithProviders(
      <CVJobPanel {...defaultProps} onOpenSmartJDModal={onOpenSmartJDModal} />
    );

    const autoFillBtn = screen.getByRole('button', { name: /Auto-fill JD/i });
    fireEvent.click(autoFillBtn);

    expect(onOpenSmartJDModal).toHaveBeenCalled();
    expect(screen.getByText(/Auto-fill from Raw JD/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste raw JD here/i)).toBeInTheDocument();
  });

  it('renders Auto-fill JD button in collapsed panel state', () => {
    renderWithProviders(<CVJobPanel {...defaultProps} isJobPanelOpen={false} />);

    const autoFillBtn = screen.getByRole('button', { name: /Auto-fill JD/i });
    expect(autoFillBtn).toBeInTheDocument();

    fireEvent.click(autoFillBtn);
    expect(screen.getByText(/Auto-fill from Raw JD/i)).toBeInTheDocument();
  });
});
