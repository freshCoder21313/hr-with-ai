import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import Header from './Header';

vi.mock('@/components/shared/CloudSyncModal', () => ({ CloudSyncModal: () => null }));
vi.mock('@/components/shared/theme-toggle', () => ({ ThemeToggle: () => null }));

const renderHeader = () =>
  render(
    <MemoryRouter initialEntries={['/studio']}>
      <TooltipProvider>
        <Header onOpenSettings={vi.fn()} />
      </TooltipProvider>
    </MemoryRouter>
  );

/**
 * Relative-luminance contrast of the header nav palette against the white
 * header. The previous palette inherited muted-foreground (slate-500) for
 * inactive links and primary (blue-600) for the active one; on-device
 * measurement over the translucent header returned 4.41:1 and 4.06:1, under the
 * 4.5:1 AA floor. The replacement is asserted here against the opaque colour.
 */
function relativeLuminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrastOnWhite = (hex: string) => 1.05 / (relativeLuminance(hex) + 0.05);

describe('header nav contrast', () => {
  it('keeps the inactive light-mode nav links at or above 4.5:1', () => {
    renderHeader();

    // slate-600, the inactive light-mode link colour: 7.57:1 on white.
    expect(contrastOnWhite('#475569')).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByRole('link', { name: 'Home' }).className).toContain('text-slate-600');
  });

  it('keeps the active light-mode nav link at or above 4.5:1 and visually distinct', () => {
    renderHeader();

    // blue-700, the active light-mode link colour: 6.68:1 on white.
    expect(contrastOnWhite('#1d4ed8')).toBeGreaterThanOrEqual(4.5);

    const active = screen.getByRole('link', { name: 'CV Studio' });
    const inactive = screen.getByRole('link', { name: 'Home' });
    expect(active.className).toContain('text-blue-700');
    expect(active.className).not.toBe(inactive.className);
  });

  it('keeps dark-mode link colours, which already passed', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Home' }).className).toContain('dark:text-slate-400');
    expect(screen.getByRole('link', { name: 'CV Studio' }).className).toContain(
      'dark:text-blue-400'
    );
  });
});
