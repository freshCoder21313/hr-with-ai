import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangeReviewCard } from './ChangeReviewCard';
import type { ProposedChange } from '../utils/cvChatUtils';

const change: ProposedChange = {
  id: 'c1',
  section: 'skills',
  action: 'update',
  newData: ['React', 'TypeScript'],
  explanation: 'Add TypeScript',
};

describe('ChangeReviewCard while a change is being persisted', () => {
  it('marks the card busy and blocks both actions', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(<ChangeReviewCard change={change} onAccept={onAccept} onReject={onReject} isPending />);

    const card = screen.getByRole('heading', { name: 'skills' }).closest('[aria-busy]');
    expect(card).toHaveAttribute('aria-busy', 'true');

    const accept = screen.getByRole('button', { name: /saving/i });
    const reject = screen.getByRole('button', { name: /reject/i });
    expect(accept).toBeDisabled();
    expect(reject).toBeDisabled();

    fireEvent.click(accept);
    fireEvent.click(reject);
    expect(onAccept).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('enables both actions once the persist settles', () => {
    render(<ChangeReviewCard change={change} onAccept={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByRole('button', { name: /accept/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeEnabled();
  });

  it('keeps a change actionable when its id is empty', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <ChangeReviewCard change={{ ...change, id: '' }} onAccept={onAccept} onReject={onReject} />
    );

    const accept = screen.getByRole('button', { name: /accept/i });
    const reject = screen.getByRole('button', { name: /reject/i });
    expect(accept).toBeEnabled();
    expect(reject).toBeEnabled();

    fireEvent.click(accept);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('disables actions while another change holds the save lock, without showing a spinner', () => {
    render(<ChangeReviewCard change={change} onAccept={vi.fn()} onReject={vi.fn()} isLocked />);

    const card = screen.getByRole('heading', { name: 'skills' }).closest('[aria-busy]');
    expect(card).toHaveAttribute('aria-busy', 'false');

    expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('renders detailed diff view when toggled for modified array items with bullets', () => {
    const workChange: ProposedChange = {
      id: 'c2',
      section: 'work',
      action: 'update',
      oldData: [
        {
          id: 'w1',
          company: 'Acme Corp',
          position: 'Engineer',
          highlights: ['Legacy database management'],
        },
      ],
      newData: [
        {
          id: 'w1',
          company: 'Acme Corp',
          position: 'Senior Engineer',
          highlights: ['Cloud migration with AWS', 'Legacy database management'],
        },
      ],
      explanation: 'Updated title and added AWS highlight',
    };

    render(<ChangeReviewCard change={workChange} onAccept={vi.fn()} onReject={vi.fn()} />);

    // Toggle detailed diff
    const diffButton = screen.getByRole('button', { name: /detailed diff/i });
    expect(diffButton).toBeInTheDocument();
    fireEvent.click(diffButton);

    // Bullet diff should show added highlight
    expect(screen.getByText(/\+ Cloud migration with AWS/i)).toBeInTheDocument();
    expect(screen.getByText(/Senior Engineer/i)).toBeInTheDocument();
  });

  it('displays modified fields clearly for object sections like basics', () => {
    const basicsChange: ProposedChange = {
      id: 'c3',
      section: 'basics',
      action: 'update',
      oldData: {
        name: 'John Doe',
        summary: 'Experienced web developer',
      },
      newData: {
        name: 'John Doe',
        summary: 'Senior full-stack engineer with AI expertise',
      },
      explanation: 'Refined professional summary for role fit',
    };

    render(<ChangeReviewCard change={basicsChange} onAccept={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText(/Experienced web developer/i)).toBeInTheDocument();
    expect(screen.getByText(/Senior full-stack engineer with AI expertise/i)).toBeInTheDocument();
  });

  it('renders removal warning when section is marked for deletion', () => {
    const deleteChange: ProposedChange = {
      id: 'c4',
      section: 'awards',
      action: 'delete',
      newData: null,
      explanation: 'Remove outdated awards section',
    };

    render(<ChangeReviewCard change={deleteChange} onAccept={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText(/This section will be removed from your resume/i)).toBeInTheDocument();
  });
});
