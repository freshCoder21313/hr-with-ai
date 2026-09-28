import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from './SettingsModal';
import * as settingsService from '@/services/core/settingsService';
import { UserSettings } from '@/types';

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const storedSettings: UserSettings = {
  hintsEnabled: false,
  autoFinishEnabled: false,
  forceToolsEnabled: false,
  apiKey: '',
  baseUrl: '',
  defaultModel: 'gemini-2.5-pro',
  maxRetries: 3,
  retryDelay: 1000,
  retryOnTimeout: true,
  retryOnRateLimit: true,
};

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.loadUserSettings).mockResolvedValue(storedSettings);
    vi.mocked(settingsService.saveUserSettings).mockImplementation(async (s: UserSettings) => s);
  });

  it('exposes the interview preference toggles when opened app-wide', async () => {
    render(<SettingsModal open onOpenChange={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('AI Interview Hints')).toBeDefined());

    expect(screen.getByText('AI Auto-Finish')).toBeDefined();
    expect(screen.getByText('Force AI Tools (Code/Draw)')).toBeDefined();

    fireEvent.click(screen.getByText(/Retry Settings/));

    expect(screen.getByText('Retry on Timeout')).toBeDefined();
    expect(screen.getByText('Retry on Rate Limit (429)')).toBeDefined();
    expect(screen.getByText('Max Retries')).toBeDefined();
    expect(screen.getByText('Initial Delay (ms)')).toBeDefined();
  });

  it('keeps a route to the AI provider / API key profiles', async () => {
    render(<SettingsModal open onOpenChange={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('AI Provider Profiles')).toBeDefined());
    expect(screen.getByRole('button', { name: 'Manage AI Profiles' })).toBeDefined();
  });

  it('describes only the settings it actually contains', async () => {
    render(<SettingsModal open onOpenChange={vi.fn()} />);

    const description = await screen.findByText(
      'Configure interview behavior, retry policy, and AI provider profiles.'
    );
    expect(description.textContent).not.toContain('voice');
  });

  it('persists a toggled preference and closes', async () => {
    const onOpenChange = vi.fn();
    render(<SettingsModal open onOpenChange={onOpenChange} />);

    await waitFor(() => expect(screen.getByText('AI Interview Hints')).toBeDefined());

    fireEvent.click(screen.getByRole('switch', { name: /AI Interview Hints/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));

    await waitFor(() => {
      expect(settingsService.saveUserSettings).toHaveBeenCalledWith(
        expect.objectContaining({ hintsEnabled: true })
      );
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when closed', () => {
    render(<SettingsModal open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText('AI Interview Hints')).toBeNull();
  });
});
