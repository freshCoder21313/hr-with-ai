import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartJDImportModal } from './SmartJDImportModal';
import { useJobStore } from '../stores/useJobStore';

const sampleJD = `
# Senior React Engineer
Company: GlobalTech Corp

About the Company:
GlobalTech is innovating modern enterprise solutions.

Responsibilities:
- Build performant web applications using React, TypeScript, and Next.js.
- Optimize frontend performance and Core Web Vitals.
- Mentor junior engineers and conduct code reviews.

Requirements:
- 5+ years of experience with React, TypeScript, and modern state management.
- Deep understanding of Tailwind CSS, Docker, and CI/CD.
`;

describe('SmartJDImportModal', () => {
  beforeEach(() => {
    useJobStore.setState({ jobs: [], globalPrompt: 'default' });
  });

  it('renders modal with raw JD textarea and parse button', () => {
    render(<SmartJDImportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Auto-fill from Raw JD/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Paste raw JD here/i)
    ).toBeInTheDocument();

    const parseButton = screen.getByRole('button', { name: /Parse & Extract/i });
    expect(parseButton).toBeDisabled();
  });

  it('parses raw JD and displays extracted preview with editable fields and badges', () => {
    render(<SmartJDImportModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/Paste raw JD here/i);
    fireEvent.change(textarea, { target: { value: sampleJD } });

    const parseButton = screen.getByRole('button', { name: /Parse & Extract/i });
    expect(parseButton).toBeEnabled();
    fireEvent.click(parseButton);

    // Verify preview fields are populated
    const companyInput = screen.getByLabelText(/Company Name/i) as HTMLInputElement;
    const titleInput = screen.getByLabelText(/Job Title/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Cleaned Description/i) as HTMLTextAreaElement;
    const promptInput = screen.getByLabelText(/Suggested Custom Prompt/i) as HTMLTextAreaElement;

    expect(companyInput.value).toBe('GlobalTech Corp');
    expect(titleInput.value).toBe('Senior React Engineer');
    expect(descInput.value).toContain('Build performant web applications');
    expect(promptInput.value).toContain('Senior React Engineer');

    // Verify badges
    expect(screen.getByText(/Level: senior/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Requirements/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Responsibilities/i)).toBeInTheDocument();

    // Verify editable
    fireEvent.change(companyInput, { target: { value: 'GlobalTech International' } });
    expect(companyInput.value).toBe('GlobalTech International');
  });

  it('adds the extracted job to useJobStore and triggers onJobAdded callback', () => {
    const onJobAdded = vi.fn();
    const onClose = vi.fn();

    render(
      <SmartJDImportModal
        isOpen={true}
        onClose={onClose}
        onJobAdded={onJobAdded}
      />
    );

    const textarea = screen.getByPlaceholderText(/Paste raw JD here/i);
    fireEvent.change(textarea, { target: { value: sampleJD } });

    fireEvent.click(screen.getByRole('button', { name: /Parse & Extract/i }));

    const addButton = screen.getByRole('button', { name: /Add to Target Jobs/i });
    expect(addButton).toBeEnabled();
    fireEvent.click(addButton);

    // Check useJobStore
    const jobs = useJobStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Senior React Engineer');
    expect(jobs[0].company).toBe('GlobalTech Corp');

    // Check callback and close
    expect(onJobAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Senior React Engineer',
        company: 'GlobalTech Corp',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking Close / Cancel button', () => {
    const onClose = vi.fn();
    render(<SmartJDImportModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Close \/ Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets the form when Reset button is clicked', () => {
    render(<SmartJDImportModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/Paste raw JD here/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: sampleJD } });

    fireEvent.click(screen.getByRole('button', { name: /Parse & Extract/i }));
    expect(screen.getByDisplayValue('GlobalTech Corp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    expect(textarea.value).toBe('');
    expect(screen.queryByDisplayValue('GlobalTech Corp')).not.toBeInTheDocument();
  });
});
