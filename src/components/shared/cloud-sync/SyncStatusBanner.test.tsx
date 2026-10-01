import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncStatusBanner } from './SyncStatusBanner';

describe('SyncStatusBanner', () => {
  it('lets the user dismiss a clipboard/sync error, which previously had no dismiss control', () => {
    const onDismiss = vi.fn();
    render(
      <SyncStatusBanner
        error="Copy failed. Copy the ID manually."
        success={null}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('still dismisses success messages', () => {
    const onDismiss = vi.fn();
    render(
      <SyncStatusBanner error={null} success="ID copied to clipboard" onDismiss={onDismiss} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss success' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses the Button size contract instead of a conflicting 24px override', () => {
    render(<SyncStatusBanner error="boom" success={null} onDismiss={vi.fn()} />);

    const dismiss = screen.getByRole('button', { name: 'Dismiss error' });
    // `size="icon"` + `h-6 w-6` used to render 24px on desktop; icon-sm is 32px.
    expect(dismiss.className).toContain('h-10');
    expect(dismiss.className).toContain('md:h-8');
    expect(dismiss.className).not.toContain('h-6 w-6');
  });

  it('omits the dismiss control when no handler is supplied', () => {
    render(<SyncStatusBanner error="boom" success={null} />);

    expect(screen.queryByRole('button', { name: 'Dismiss error' })).toBeNull();
  });
});
