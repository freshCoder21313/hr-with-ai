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
});
