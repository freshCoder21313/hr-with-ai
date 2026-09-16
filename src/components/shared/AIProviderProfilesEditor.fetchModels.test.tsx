import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIProviderProfilesEditor } from './AIProviderProfilesEditor';
import * as aiConfigService from '@/services/ai/aiConfigService';
import * as settingsService from '@/services/core/settingsService';
import { toast } from 'sonner';

vi.mock('@/services/ai/aiConfigService', async () => {
  const actual = await vi.importActual<any>('@/services/ai/aiConfigService');
  return {
    ...actual,
    fetchProviderModels: vi.fn(),
    testAIConnection: vi.fn(),
  };
});

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AIProviderProfilesEditor Fetch Models', () => {
  const mockSettings = {
    aiProfiles: [
      {
        id: 'p1',
        name: 'OpenAI Profile',
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
        modelIds: ['gpt-4'],
        enabled: true,
      },
    ],
    activeAIProfileId: 'p1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsService.loadUserSettings as any).mockResolvedValue(mockSettings);
  });

  it('renders fetch models button', async () => {
    render(<AIProviderProfilesEditor />);
    await waitFor(() => expect(screen.getByText('OpenAI Profile')).toBeDefined());

    expect(screen.getByText('Fetch Models')).toBeDefined();
  });

  it('fetches models and displays them', async () => {
    const mockModels = ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo'];
    (aiConfigService.fetchProviderModels as any).mockResolvedValue(mockModels);

    render(<AIProviderProfilesEditor />);
    await waitFor(() => expect(screen.getByText('OpenAI Profile')).toBeDefined());

    const fetchButton = screen.getByText('Fetch Models');
    fireEvent.click(fetchButton);

    await waitFor(() => expect(screen.getByText('Available Models')).toBeDefined());

    // Check that models are displayed (excluding the one already in modelIds which might be hidden or disabled)
    expect(screen.getByText('gpt-4o')).toBeDefined();
    expect(screen.getByText('gpt-3.5-turbo')).toBeDefined();
  });

  it('adds a model to the list when clicked', async () => {
    (aiConfigService.fetchProviderModels as any).mockResolvedValue(['gpt-4o']);

    render(<AIProviderProfilesEditor />);
    await waitFor(() => expect(screen.getByText('OpenAI Profile')).toBeDefined());

    fireEvent.click(screen.getByText('Fetch Models'));
    await waitFor(() => expect(screen.getByText('gpt-4o')).toBeDefined());

    const badge = screen.getByText('gpt-4o');
    fireEvent.click(badge);

    const textarea = screen.getByPlaceholderText(/gpt-4o/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('gpt-4\ngpt-4o');
  });

  it('adds all models when "Add All" is clicked', async () => {
    (aiConfigService.fetchProviderModels as any).mockResolvedValue(['gpt-4o', 'gpt-3.5-turbo']);

    render(<AIProviderProfilesEditor />);
    await waitFor(() => expect(screen.getByText('OpenAI Profile')).toBeDefined());

    fireEvent.click(screen.getByText('Fetch Models'));
    await waitFor(() => expect(screen.getByText('Add All')).toBeDefined());

    fireEvent.click(screen.getByText('Add All'));

    const textarea = screen.getByPlaceholderText(/gpt-4o/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('gpt-4\ngpt-4o\ngpt-3.5-turbo');
  });

  it('shows generic error toast on fetch failure', async () => {
    (aiConfigService.fetchProviderModels as any).mockRejectedValue(new Error('Network Error'));

    render(<AIProviderProfilesEditor />);
    await waitFor(() => expect(screen.getByText('OpenAI Profile')).toBeDefined());

    fireEvent.click(screen.getByText('Fetch Models'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network Error');
    });
  });
});
