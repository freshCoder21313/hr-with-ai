import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatArea, AnalysisItem } from './ChatArea';
import { Message } from '@/types';

beforeAll(() => {
  // jsdom implements neither scrollIntoView nor the smooth-scroll options object.
  Element.prototype.scrollIntoView = vi.fn();
});

const analysis: AnalysisItem = {
  question: 'Tell me about yourself',
  analysis: 'Clear and concise.',
  improvement: 'Add a measurable outcome.',
};

const messages: Message[] = [
  { role: 'user', content: 'My name is Sam', timestamp: 1 },
  { role: 'model', content: 'Thanks Sam.', timestamp: 2 },
];

describe('ChatArea AI feedback disclosure', () => {
  it('exposes aria-expanded/aria-controls and moves focus across the expand/collapse swap', () => {
    render(<ChatArea messages={messages} analysisMap={{ 0: analysis }} />);

    const collapsed = screen.getByRole('button', { name: /view ai analysis/i });
    expect(collapsed).toHaveAttribute('aria-expanded', 'false');
    expect(collapsed).not.toHaveAttribute('aria-controls');

    fireEvent.click(collapsed);

    const expanded = screen.getByRole('button', { name: /ai feedback/i });
    const panelId = expanded.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toBeTruthy();
    // The pill unmounts itself, so focus must follow to the replacement toggle.
    expect(document.activeElement).toBe(expanded);

    fireEvent.click(expanded);

    const recollapsed = screen.getByRole('button', { name: /view ai analysis/i });
    expect(recollapsed).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(recollapsed);
  });
});

describe('ChatArea error turns', () => {
  it('renders a non-last error turn without Retry, and offers Retry only on the last', () => {
    const onRetry = vi.fn();
    render(
      <ChatArea
        messages={[
          {
            role: 'model',
            content: 'Interrupted by a newer message.',
            isError: true,
            timestamp: 1,
          },
          { role: 'user', content: 'Second question', timestamp: 2 },
          { role: 'model', content: 'Rate limit exceeded', isError: true, timestamp: 3 },
        ]}
        onRetry={onRetry}
      />
    );

    expect(screen.getAllByText(/failed to generate response/i)).toHaveLength(2);

    const retries = screen.getAllByRole('button', { name: /retry/i });
    expect(retries).toHaveLength(1);

    fireEvent.click(retries[0]);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
