import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CVJobCard } from './CVJobCard';
import type { Job } from '../stores/useJobStore';
import type { JobWithStatus } from '../hooks/useCVTailoring';

const job: Job = {
  id: 'j1',
  company: 'Acme',
  title: 'SWE',
  description: 'Old JD',
  customPrompt: '',
};

const renderCard = (status: Partial<JobWithStatus>, isProcessing = false) => {
  const handlers = {
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onChange: vi.fn(),
    onViewResult: vi.fn(),
    onReTailor: vi.fn(),
  };
  render(
    <CVJobCard
      job={job}
      isSelected={false}
      status={status}
      isProcessing={isProcessing}
      {...handlers}
    />
  );
  return handlers;
};

describe('CVJobCard for a completed job', () => {
  it('still allows correcting the job description', () => {
    const handlers = renderCard({ status: 'completed', resultId: 9 });

    fireEvent.click(screen.getByRole('button', { name: /expand job details/i }));
    const description = screen.getByLabelText('Job Description');
    expect(description).toBeEnabled();

    fireEvent.change(description, { target: { value: 'Corrected JD' } });
    expect(handlers.onChange).toHaveBeenCalledWith('description', 'Corrected JD');
  });

  it('offers an explicit re-tailor path and still keeps the prior result reachable', () => {
    const handlers = renderCard({ status: 'completed', resultId: 9 });

    fireEvent.click(screen.getByRole('button', { name: /expand job details/i }));

    fireEvent.click(screen.getByRole('button', { name: /re-tailor/i }));
    expect(handlers.onReTailor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /view tailored cv/i }));
    expect(handlers.onViewResult).toHaveBeenCalledWith(9);
  });

  it('does not offer re-tailoring for a job that never completed', () => {
    renderCard({ status: 'idle' });
    fireEvent.click(screen.getByRole('button', { name: /expand job details/i }));
    expect(screen.queryByRole('button', { name: /re-tailor/i })).toBeNull();
  });

  it('freezes edits only while the job is actually processing', () => {
    renderCard({ status: 'processing' }, true);
    fireEvent.click(screen.getByRole('button', { name: /expand job details/i }));

    expect(screen.getByLabelText('Job Description')).toBeDisabled();
    expect(screen.getByLabelText('Company')).toBeDisabled();
    expect(screen.getByLabelText('Job URL (optional)')).toBeDisabled();
  });

  it('renders external link button in header when job has url', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const jobWithUrl: Job = {
      ...job,
      url: 'https://example.com/job/123',
    };

    const handlers = {
      onSelect: vi.fn(),
      onRemove: vi.fn(),
      onChange: vi.fn(),
      onViewResult: vi.fn(),
      onReTailor: vi.fn(),
    };

    render(
      <CVJobCard
        job={jobWithUrl}
        isSelected={false}
        status={{ status: 'idle' }}
        isProcessing={false}
        {...handlers}
      />
    );

    const openLinkBtn = screen.getByRole('button', { name: /open original job posting/i });
    expect(openLinkBtn).toBeInTheDocument();

    fireEvent.click(openLinkBtn);
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://example.com/job/123',
      '_blank',
      'noopener,noreferrer'
    );

    windowOpenSpy.mockRestore();
  });

  it('allows editing job URL in expanded form', () => {
    const handlers = renderCard({ status: 'idle' });

    fireEvent.click(screen.getByRole('button', { name: /expand job details/i }));
    const urlInput = screen.getByLabelText('Job URL (optional)');
    expect(urlInput).toBeEnabled();

    fireEvent.change(urlInput, { target: { value: 'https://careers.google.com/jobs/456' } });
    expect(handlers.onChange).toHaveBeenCalledWith('url', 'https://careers.google.com/jobs/456');
  });
});
