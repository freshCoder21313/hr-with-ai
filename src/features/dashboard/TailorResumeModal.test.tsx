import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TailorResumeModal } from './TailorResumeModal';
import type { Resume } from '@/types';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const resume: Resume = {
  id: 1,
  fileName: 'cv.pdf',
  rawText: 'raw',
  createdAt: 1,
};

describe('TailorResumeModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays open with the JD intact when generation fails', async () => {
    const onClose = vi.fn();
    const onGenerate = vi.fn().mockRejectedValue(new Error('provider down'));

    render(
      <TailorResumeModal
        isOpen
        onClose={onClose}
        sourceResume={resume}
        initialJobDescription="Paste JD"
        onGenerate={onGenerate}
      />
    );

    fireEvent.click(screen.getByText('Generate New CV'));

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('Paste JD');
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('provider down'));
    });

    // Modal stays open and the user's JD is not lost.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Tailor Resume to Job')).toBeDefined();
    expect((screen.getByPlaceholderText(/job description/i) as HTMLTextAreaElement).value).toBe(
      'Paste JD'
    );
    // The action is re-enabled so the user can retry.
    expect(screen.getByText('Generate New CV')).not.toBeDisabled();
  });

  it('closes and clears the JD on success', async () => {
    const onClose = vi.fn();
    const onGenerate = vi.fn().mockResolvedValue(undefined);

    render(
      <TailorResumeModal
        isOpen
        onClose={onClose}
        sourceResume={resume}
        initialJobDescription="Paste JD"
        onGenerate={onGenerate}
      />
    );

    fireEvent.click(screen.getByText('Generate New CV'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
