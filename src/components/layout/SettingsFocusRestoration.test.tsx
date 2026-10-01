import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import Header from './Header';
import SettingsModal from '@/components/shared/SettingsModal';
import * as settingsService from '@/services/core/settingsService';
import { UserSettings } from '@/types';
import { useFocusReturn } from '@/components/shared/useFocusReturn';

vi.mock('@/components/shared/CloudSyncModal', () => ({ CloudSyncModal: () => null }));
vi.mock('@/components/shared/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const storedSettings: UserSettings = {
  hintsEnabled: false,
  autoFinishEnabled: false,
  forceToolsEnabled: false,
  apiKey: '',
  baseUrl: '',
  defaultModel: '',
  maxRetries: 3,
  retryDelay: 1000,
  retryOnTimeout: true,
  retryOnRateLimit: true,
};

/** Wires Header + SettingsModal exactly as App does. */
function Shell() {
  const [open, setOpen] = React.useState(false);
  const settingsFocus = useFocusReturn();
  return (
    <MemoryRouter>
      <TooltipProvider>
        <Header
          onOpenSettings={(trigger) => {
            settingsFocus.capture(trigger);
            setOpen(true);
          }}
        />
        <SettingsModal
          restoreFocusTarget={settingsFocus.triggerRef.current}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) settingsFocus.restore();
          }}
        />
      </TooltipProvider>
    </MemoryRouter>
  );
}

describe('settings focus restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.loadUserSettings).mockResolvedValue(storedSettings);
    vi.mocked(settingsService.saveUserSettings).mockImplementation(async (s: UserSettings) => s);
  });

  it('returns focus to the desktop header settings button after Escape', async () => {
    render(<Shell />);
    const button = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(button);

    await screen.findByText('AI Interview Hints');
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus());
  });

  it('returns focus to a still-mounted launcher after the settings dialog X closes', async () => {
    render(<Shell />);
    const button = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(button);

    await screen.findByText('AI Interview Hints');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus());
  });

  it('returns focus to the menu launcher when settings was opened from the mobile sheet', async () => {
    render(<Shell />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));

    await screen.findByText('AI Interview Hints');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveFocus());
  });
});
