import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import Header from './Header';

vi.mock('@/components/shared/CloudSyncModal', () => ({
  CloudSyncModal: () => null,
}));

vi.mock('@/components/shared/theme-toggle', () => ({
  ThemeToggle: () => null,
}));

const OPEN_API_KEY_MODAL_EVENT = 'OPEN_API_KEY_MODAL';

describe('Header settings entry point', () => {
  let apiKeyEventSpy: Mock;

  beforeEach(() => {
    apiKeyEventSpy = vi.fn();
    window.addEventListener(OPEN_API_KEY_MODAL_EVENT, apiKeyEventSpy);
  });

  const renderHeader = (onOpenSettings: () => void) =>
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Header onOpenSettings={onOpenSettings} />
        </TooltipProvider>
      </MemoryRouter>
    );

  it('routes the settings button to the settings handler, not the API key modal', () => {
    const onOpenSettings = vi.fn();
    renderHeader(onOpenSettings);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(apiKeyEventSpy).not.toHaveBeenCalled();
  });

  it('exposes the settings entry point in the mobile menu', async () => {
    const onOpenSettings = vi.fn();
    renderHeader(onOpenSettings);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));

    await waitFor(() => expect(onOpenSettings).toHaveBeenCalledTimes(1));
  });

  it('no longer labels the entry point as API key settings', () => {
    renderHeader(vi.fn());

    expect(screen.queryByRole('button', { name: 'API Key Settings' })).toBeNull();
  });
});
