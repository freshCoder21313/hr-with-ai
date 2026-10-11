import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ApiKeyModal from './ApiKeyModal';
import { openApiKeyModal } from '@/events/apiKeyEvents';

vi.mock('./AIProviderProfilesEditor', () => ({
  AIProviderProfilesEditor: () => <div data-testid="ai-provider-profiles-editor" />,
}));

describe('ApiKeyModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does not open automatically on initial render even without API keys', () => {
    render(<ApiKeyModal />);
    expect(screen.queryByText('AI Provider Profiles')).toBeNull();
  });

  it('opens when openApiKeyModal event is triggered', async () => {
    render(<ApiKeyModal />);
    expect(screen.queryByText('AI Provider Profiles')).toBeNull();

    act(() => {
      openApiKeyModal();
    });
    expect(await screen.findByText('AI Provider Profiles')).toBeDefined();
  });
});
