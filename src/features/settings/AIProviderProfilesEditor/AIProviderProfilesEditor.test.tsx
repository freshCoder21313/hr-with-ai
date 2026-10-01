import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIProviderProfilesEditor } from './index';
import * as settingsService from '@/services/core/settingsService';
import * as aiConfigService from '@/services/ai/aiConfigService';
import * as notificationService from '@/services/core/notificationService';
import { UserSettings } from '@/types';

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}));

vi.mock('@/services/ai/aiConfigService', () => ({
  testAIConnection: vi.fn(),
  getServiceWithOptions: vi.fn(),
}));

vi.mock('@/services/core/notificationService', () => ({
  notificationService: {
    confirm: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('AIProviderProfilesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (settingsService.loadUserSettings as any).mockResolvedValue(mockSettings);
  });

  it('renders profiles list and selected profile details', async () => {
    render(<AIProviderProfilesEditor />);

    await waitFor(() => {
      expect(screen.getByText('Default Profile')).toBeDefined();
      expect(screen.getAllByText('Fallback Profile').length).toBeGreaterThan(0);
    });

    expect(screen.getByDisplayValue('Default Profile')).toBeDefined();
    expect(screen.getByDisplayValue('key-1')).toBeDefined();
  });

  it('switches editing profile when clicked', async () => {
    render(<AIProviderProfilesEditor />);

    await waitFor(() => screen.getAllByText('Fallback Profile'));

    // Click the one in the main list (first one)
    fireEvent.click(screen.getAllByText('Fallback Profile')[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Fallback Profile')).toBeDefined();
      expect(screen.getByDisplayValue('key-2')).toBeDefined();
    });
  });

  it('adds a new profile', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() => screen.getByTitle('Add new profile'));

    fireEvent.click(screen.getByTitle('Add new profile'));

    await waitFor(() => {
      expect(screen.getByText('New Profile 3')).toBeDefined();
      expect(screen.getByDisplayValue('New Profile 3')).toBeDefined();
    });
  });

  it('guards against deleting the active profile', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() => screen.getByText('Default Profile'));

    const deleteButtons = screen.getAllByTitle('Delete');
    // First profile is active, so delete button should be disabled
    expect(deleteButtons[0]).toBeDisabled();
  });

  it('validates unique names before saving', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() => screen.getByDisplayValue('Default Profile'));

    // Change name to match second profile
    const nameInput = screen.getByDisplayValue('Default Profile');
    fireEvent.change(nameInput, { target: { value: 'Fallback Profile' } });

    fireEvent.click(screen.getByText('Save All'));

    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('not unique'));
  });

  it('calls testAIConnection without fallback', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() => screen.getByText('Run Test'));

    fireEvent.click(screen.getByText('Run Test'));

    expect(aiConfigService.testAIConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'key-1',
        source: 'explicit',
      })
    );
  });

  it('keeps the profile when delete confirmation is declined', async () => {
    vi.mocked(notificationService.notificationService.confirm).mockResolvedValue(false);
    render(<AIProviderProfilesEditor />);
    await waitFor(() => screen.getByText('Default Profile'));

    fireEvent.click(screen.getAllByTitle('Delete')[1]);

    await waitFor(() => {
      expect(notificationService.notificationService.confirm).toHaveBeenCalled();
    });
    expect(screen.getAllByText('Fallback Profile').length).toBeGreaterThan(0);
  });

  it('removes the profile and its fallback entry once confirmed', async () => {
    vi.mocked(notificationService.notificationService.confirm).mockResolvedValue(true);
    render(<AIProviderProfilesEditor />);
    await waitFor(() => screen.getByText('Default Profile'));

    fireEvent.click(screen.getAllByTitle('Delete')[1]);

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Fallback Profile')).toBeNull();
    });
    expect(screen.queryByLabelText('Remove Fallback Profile from the fallback chain')).toBeNull();
  });

  it('surfaces a load failure with a retry that recovers', async () => {
    vi.mocked(settingsService.loadUserSettings)
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValue(mockSettings);

    render(<AIProviderProfilesEditor />);

    await waitFor(() => {
      expect(screen.getByText(/Database unavailable/)).toBeDefined();
    });
    expect(screen.queryByText('Loading profiles...')).toBeNull();

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Default Profile')).toBeDefined();
    });
    expect(screen.queryByText(/Database unavailable/)).toBeNull();
  });
});
