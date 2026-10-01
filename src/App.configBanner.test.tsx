import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  normalizeUserSettings,
  mirrorActiveProfileToLocalStorage,
} from '@/services/ai/aiProfileService';
import type { UserSettings } from '@/types';
import App from './App';

vi.mock('@/lib/db', () => ({
  db: { cleanOldResumes: vi.fn(async () => undefined) },
}));

// Dexie has no backing store in jsdom; the localStorage mirroring the editor
// relies on stays real so the banner's hasActiveProfile() check is genuine.
vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(async () => profileSettings),
  saveUserSettings: vi.fn(async (settings: UserSettings) => {
    const normalized = normalizeUserSettings(settings);
    mirrorActiveProfileToLocalStorage(normalized);
    return normalized;
  }),
}));
vi.mock('@/services/ai/aiConfigService', () => ({
  testAIConnection: vi.fn(),
  fetchProviderModels: vi.fn(),
}));
vi.mock('@/components/providers/NotificationProvider', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/features/landing/LandingPage', () => ({ default: () => <div>landing</div> }));
vi.mock('@/components/shared/CloudSyncModal', () => ({ CloudSyncModal: () => null }));
vi.mock('@/components/shared/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
// jsdom has no matchMedia; the theme provider queries it on mount.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const profileSettings: UserSettings = {
  aiProfiles: [
    {
      id: 'profile-1',
      name: 'Primary',
      provider: 'google',
      apiKey: 'key-1',
      modelIds: ['gemini-1.5-pro'],
      enabled: true,
    },
  ],
  activeAIProfileId: 'profile-1',
  aiFallbackProfileIds: [],
};

describe('first-run configuration banner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows on a fresh install with no AI profile configured', async () => {
    render(<App />);

    expect(await screen.findByText(/AI provider not configured/i)).toBeDefined();
  });

  it('clears once a profile is saved through the editor, without a reload or the dismiss flag', async () => {
    render(<App />);
    await screen.findByText(/AI provider not configured/i);

    // Drive the real editor the banner's own CTA opens, and save for real.
    fireEvent.click(screen.getByText('Set up now'));
    fireEvent.click(await screen.findByText('Save All'));

    await waitFor(() => expect(screen.queryByText(/AI provider not configured/i)).toBeNull());
    // The banner cleared on its own; the user never dismissed it.
    expect(localStorage.getItem('ai_setup_banner_dismissed')).toBeNull();
  });

  it('stays hidden after an explicit dismissal across a remount', async () => {
    const first = render(<App />);
    await screen.findByText(/AI provider not configured/i);

    first.unmount();
    localStorage.setItem('ai_setup_banner_dismissed', 'true');

    render(<App />);
    expect(screen.queryByText(/AI provider not configured/i)).toBeNull();
  });
});
