import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './sheet';

/**
 * The X glyph is 16px. WCAG 2.2 AA (2.5.8) asks for a 24px minimum target, and
 * the UX bar for a primary close control is 32px. These assertions pin the size
 * contract so a future refactor cannot silently shrink it again — `icon-xs`
 * (24px desktop) was the original defect.
 */
describe('overlay close targets', () => {
  it('gives the dialog close button a 32px box with a centered glyph', () => {
    render(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogTitle>Example</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.className).toContain('h-8');
    expect(close.className).toContain('w-8');
    expect(close.className).toContain('inline-flex');
    expect(close.className).toContain('items-center');
    expect(close.className).toContain('justify-center');
  });

  it('gives the sheet close button the same 32px box', () => {
    render(
      <Sheet open onOpenChange={vi.fn()}>
        <SheetContent>
          <SheetTitle>Menu</SheetTitle>
        </SheetContent>
      </Sheet>
    );

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.className).toContain('h-8');
    expect(close.className).toContain('w-8');
    expect(close.className).toContain('inline-flex');
  });

  it('keeps the close control keyboard-reachable with a visible focus ring', () => {
    render(
      <Sheet open onOpenChange={vi.fn()}>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Menu</SheetTitle>
        </SheetContent>
      </Sheet>
    );

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.tagName).toBe('BUTTON');
    expect(close).not.toHaveAttribute('tabindex', '-1');
    expect(close.className).toContain('focus:ring-2');
  });
});
