import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TourHelpButton } from './TourHelpButton';
import { useTourStore } from '@/services/tour/tourStore';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('TourHelpButton', () => {
  beforeEach(() => {
    useTourStore.getState().resetAllTours();
  });

  const renderWithRouter = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <TooltipProvider>
          <TourHelpButton />
        </TooltipProvider>
      </MemoryRouter>
    );
  };

  it('renders help button with accessible label', () => {
    renderWithRouter('/');
    const btn = screen.getByRole('button', { name: /tour guide/i });
    expect(btn).toBeInTheDocument();
  });

  it('triggers startTour for current route when clicked', () => {
    renderWithRouter('/studio');
    const btn = screen.getByRole('button', { name: /tour guide/i });

    fireEvent.click(btn);

    const state = useTourStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.activeTourId).toBe('tour_studio');
  });

  it('forces tour start even if user had dismissed all tours', () => {
    useTourStore.getState().dismissAllTours();
    renderWithRouter('/setup');

    const btn = screen.getByRole('button', { name: /tour guide/i });
    fireEvent.click(btn);

    const state = useTourStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.activeTourId).toBe('tour_setup');
  });
});
