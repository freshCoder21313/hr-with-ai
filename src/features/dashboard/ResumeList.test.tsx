import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResumeList from './ResumeList';
import { Resume } from '@/types';
import { TooltipProvider } from '@/components/ui/tooltip';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock GitHubImportModal
vi.mock('@/features/resume-builder', () => ({
  GitHubImportModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="github-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

describe('ResumeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleResumes: Resume[] = [
    {
      id: 1,
      fileName: 'Software Engineer CV',
      createdAt: Date.now(),
      rawText: 'Sample raw text',
      isMain: true,
    },
    {
      id: 2,
      fileName: 'Product Manager CV',
      createdAt: Date.now() - 10000,
      rawText: 'Another raw text',
      isMain: false,
    },
  ];

  it('renders "Import from GitHub" button and opens modal when clicked in empty state', () => {
    render(
      <TooltipProvider>
        <ResumeList resumes={[]} onSelect={vi.fn()} onDelete={vi.fn()} />
      </TooltipProvider>
    );

    expect(screen.getByText(/Saved Resumes/i)).toBeInTheDocument();
    expect(screen.getByText(/No saved CVs yet/i)).toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: /import from github/i });
    expect(importButton).toBeInTheDocument();

    expect(screen.queryByTestId('github-modal')).not.toBeInTheDocument();
    fireEvent.click(importButton);
    expect(screen.getByTestId('github-modal')).toBeInTheDocument();
  });

  it('renders "Import from GitHub" button and opens modal when resumes exist', () => {
    render(
      <TooltipProvider>
        <ResumeList resumes={sampleResumes} onSelect={vi.fn()} onDelete={vi.fn()} />
      </TooltipProvider>
    );

    expect(screen.getByText('Software Engineer CV')).toBeInTheDocument();
    expect(screen.getByText('Product Manager CV')).toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: /import from github/i });
    expect(importButton).toBeInTheDocument();

    fireEvent.click(importButton);
    expect(screen.getByTestId('github-modal')).toBeInTheDocument();
  });

  it('navigates to /studio when clicking chat with AI on main CV', () => {
    render(
      <TooltipProvider>
        <ResumeList resumes={sampleResumes} onSelect={vi.fn()} onDelete={vi.fn()} />
      </TooltipProvider>
    );

    const chatButton = screen.getByLabelText(/chat with ai to update software engineer cv/i);
    expect(chatButton).toBeInTheDocument();

    fireEvent.click(chatButton);
    expect(mockNavigate).toHaveBeenCalledWith('/studio');
  });
});
