import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { InlineEdit } from './InlineEdit';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// The trigger is named by its field label (or the placeholder, then a generic
// fallback), not by the value it happens to hold.
const getTrigger = () => screen.getByRole('button');

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('InlineEdit keyboard accessibility', () => {
  it('exposes the static value as a focusable inline button', () => {
    render(<InlineEdit as="h3" value="Acme Corp" onSave={vi.fn()} />);
    const trigger = getTrigger();
    expect(trigger.tagName).toBe('SPAN');
    expect(trigger).toHaveAttribute('tabindex', '0');
    // Heading semantics survive: the trigger is not the heading itself.
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Acme Corp');
  });

  it.each([
    ['Enter', { key: 'Enter' }],
    ['Space', { key: ' ' }],
  ])('starts editing on %s without inserting a character', (_name, keyEvent) => {
    const onSave = vi.fn();
    render(<InlineEdit value="Acme" onSave={onSave} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.keyDown(getTrigger(), keyEvent);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Acme');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the typed value on Enter and returns focus to the trigger', async () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Acme" onSave={onSave} />);

    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Globex' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSave).toHaveBeenCalledWith('Globex');
    await waitFor(() => expect(document.activeElement).toBe(getTrigger()));
  });

  it('does not re-run focus while typing', () => {
    // The focus effect used to depend on the value length, which re-focused and
    // reset the caret to the end on every keystroke.
    const focusSpy = vi.fn();
    render(<InlineEdit value="Acme Corp" onSave={vi.fn()} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    const input = screen.getByRole('textbox');
    input.addEventListener('focus', focusSpy);

    fireEvent.change(input, { target: { value: 'Acme C' } });
    fireEvent.change(input, { target: { value: 'Acme Co' } });
    fireEvent.change(input, { target: { value: 'Acme Cor' } });

    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it('discards the edit on Escape without saving', () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Acme" onSave={onSave} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Globex' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(getTrigger()).toHaveTextContent('Acme');
  });

  it('does not commit when the input unmounts without a user edit', () => {
    const onSave = vi.fn();
    const { rerender } = render(<InlineEdit value="Acme" onSave={onSave} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Globex' } });
    // Parent-driven update unmounts the editing input; the blur React fires on
    // unmount must not commit the pending value.
    rerender(<InlineEdit value="Other" onSave={onSave} />);
    expect(onSave).not.toHaveBeenCalledWith('Globex');
  });

  it('does not save when the value is unchanged', () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Acme" onSave={onSave} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Acme  ' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reports a rejected async save instead of leaving it unhandled', async () => {
    const rejection = new Error('db down');
    const onSave = vi.fn(() => Promise.reject(rejection));
    render(<InlineEdit value="Acme" onSave={onSave} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Globex' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    await waitFor(() => expect(logger.error).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalled();
  });

  it('reports a synchronous throw from onSave', () => {
    const onSave = vi.fn(() => {
      throw new Error('boom');
    });
    render(<InlineEdit value="Acme" onSave={onSave} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Globex' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('labels the edit field, falling back to the placeholder then a generic name', () => {
    const { rerender } = render(
      <InlineEdit value="" placeholder="Your full name" onSave={vi.fn()} />
    );
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    expect(screen.getByRole('textbox', { name: 'Your full name' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    rerender(<InlineEdit value="" onSave={vi.fn()} />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    expect(screen.getByRole('textbox', { name: 'Edit field' })).toBeInTheDocument();
  });

  it('names the trigger and its textbox after the field, not the value', () => {
    render(<InlineEdit as="h3" value="Acme Corp" label="Company" onSave={vi.fn()} />);

    expect(getTrigger()).toHaveAccessibleName('Company, edit');

    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    expect(screen.getByRole('textbox', { name: 'Company' })).toBeInTheDocument();
  });

  it('hints at the field without implying a mouse is required', () => {
    const { rerender } = render(<InlineEdit value="Acme" onSave={vi.fn()} />);
    expect(getTrigger().getAttribute('title')).toBe('Edit');

    rerender(<InlineEdit value="Acme" label="Company" onSave={vi.fn()} />);
    expect(getTrigger().getAttribute('title')).toBe('Edit Company');
    expect(getTrigger().getAttribute('title')).not.toMatch(/click/i);
  });

  it('still opens the editor from the keyboard when a label is set', () => {
    render(<InlineEdit value="Acme" label="Company" onSave={vi.fn()} />);

    fireEvent.keyDown(getTrigger(), { key: ' ' });

    expect(screen.getByRole('textbox', { name: 'Company' })).toBeInTheDocument();
  });

  it('does not expose an editor when readOnly', () => {
    render(<InlineEdit value="Acme" onSave={vi.fn()} readOnly />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});
