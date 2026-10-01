import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIProviderProfilesEditor } from './index';
import * as settingsService from '@/services/core/settingsService';
import * as notificationService from '@/services/core/notificationService';
import { UserSettings } from '@/types';

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  testAIConnection: vi.fn(),
  fetchProviderModels: vi.fn(),
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: { confirm: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const mockSettings: UserSettings = {
  aiProfiles: [
    {
      id: 'profile-1',
      name: 'Default Profile',
      provider: 'google',
      apiKey: 'key-1',
      modelIds: ['gemini-1.5-pro'],
      enabled: true,
    },
    {
      id: 'profile-2',
      name: 'Fallback Profile',
      provider: 'openai',
      apiKey: 'key-2',
      modelIds: ['gpt-4o'],
      enabled: true,
    },
  ],
  activeAIProfileId: 'profile-1',
  aiFallbackProfileIds: ['profile-2'],
};

describe('AI provider profile usability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.loadUserSettings).mockResolvedValue(structuredClone(mockSettings));
  });

  it('gives row actions a 32px+ desktop target instead of the 24px icon-xs', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Duplicate profile Fallback Profile' })
      ).toBeDefined()
    );

    const duplicate = screen.getByRole('button', { name: 'Duplicate profile Fallback Profile' });
    const remove = screen.getByRole('button', { name: 'Delete profile Fallback Profile' });

    // icon-sm is 32px desktop / 40px touch; icon-xs was 24px desktop.
    for (const button of [duplicate, remove]) {
      expect(button.className).toContain('md:h-8');
      expect(button.className).not.toContain('md:h-6');
    }
  });

  it('keeps the destructive delete visible without hover', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete profile Fallback Profile' })).toBeDefined()
    );

    const remove = screen.getByRole('button', { name: 'Delete profile Fallback Profile' });
    // A hover-only reveal (`md:opacity-0 md:group-hover:opacity-100`) left the
    // destructive action invisible until pointer hover.
    expect(remove.className).not.toContain('opacity-0');
    expect(remove.closest('div[opacity]')?.className ?? '').not.toContain('opacity-0');
  });

  it('confirms a repeated delete only once per profile', async () => {
    let resolveConfirm: ((v: boolean) => void) | undefined;
    vi.mocked(notificationService.notificationService.confirm).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        })
    );

    render(<AIProviderProfilesEditor />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete profile Fallback Profile' })).toBeDefined()
    );

    const remove = screen.getByRole('button', { name: 'Delete profile Fallback Profile' });
    fireEvent.click(remove);
    fireEvent.click(remove);
    fireEvent.click(remove);

    // Repeated taps used to queue one confirmation dialog per tap.
    expect(notificationService.notificationService.confirm).toHaveBeenCalledTimes(1);

    resolveConfirm?.(true);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Delete profile Fallback Profile' })).toBeNull()
    );
  });

  it('allows a new confirmation after the previous one is resolved', async () => {
    vi.mocked(notificationService.notificationService.confirm).mockResolvedValue(false);

    render(<AIProviderProfilesEditor />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete profile Fallback Profile' })).toBeDefined()
    );

    const remove = screen.getByRole('button', { name: 'Delete profile Fallback Profile' });
    fireEvent.click(remove);
    await waitFor(() =>
      expect(notificationService.notificationService.confirm).toHaveBeenCalledTimes(1)
    );

    fireEvent.click(remove);
    await waitFor(() =>
      expect(notificationService.notificationService.confirm).toHaveBeenCalledTimes(2)
    );
  });

  it('never opens a confirmation for the active profile', async () => {
    vi.mocked(notificationService.notificationService.confirm).mockResolvedValue(true);

    render(<AIProviderProfilesEditor />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete profile Fallback Profile' })).toBeDefined()
    );

    const remove = screen.getByRole('button', { name: 'Delete profile Default Profile' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);

    expect(notificationService.notificationService.confirm).not.toHaveBeenCalled();
  });
});
