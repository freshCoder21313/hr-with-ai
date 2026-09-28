import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react';

import { VoiceSettingsDialog } from './VoiceSettingsDialog';
import { useVoiceInterviewStore } from '@/features/interview/stores/voiceInterviewStore';

const getVoices = vi.fn();

vi.mock('@/services/voice/textToSpeechService', () => ({
  textToSpeechService: {
    getVoices: () => getVoices(),
  },
}));

vi.mock('@/services/voice/speechToTextService', () => ({
  DEFAULT_SILENCE_TIMEOUT_MS: 4000,
  speechToTextService: { setOnSilenceCallback: vi.fn() },
}));

const loadUserSettings = vi.fn();
const saveUserSettings = vi.fn();

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: (...args: unknown[]) => loadUserSettings(...args),
  saveUserSettings: (...args: unknown[]) => saveUserSettings(...args),
}));

const BASE_SETTINGS = {
  language: 'en-US',
  sttProvider: 'web-speech' as const,
  ttsProvider: 'web-speech' as const,
  speechRate: 1,
  pitch: 1,
  volume: 1,
  autoPlayResponse: true,
  pushToTalk: false,
  silenceTimeout: 4000,
};

describe('VoiceSettingsDialog', () => {
  beforeAll(() => {
    // Radix's slider measures its thumb via ResizeObserver, which jsdom lacks.
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    getVoices.mockReturnValue([]);
    loadUserSettings.mockResolvedValue({});
    saveUserSettings.mockResolvedValue({});
    act(() => {
      useVoiceInterviewStore.setState({ voiceSettings: { ...BASE_SETTINGS } });
    });
  });

  it('renders the current settings from the store', () => {
    act(() => {
      useVoiceInterviewStore.setState({
        voiceSettings: { ...BASE_SETTINGS, speechRate: 1.5, pushToTalk: true },
      });
    });

    render(<VoiceSettingsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText('1.5x')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /push to talk/i })).toBeChecked();
  });

  it('commits a changed silence timeout to the store on save', () => {
    render(<VoiceSettingsDialog open onOpenChange={vi.fn()} />);

    // Radix sliders respond to arrow keys on the focused thumb.
    const silenceTimeoutGroup = screen.getByRole('group', { name: /silence timeout/i });
    const silenceTimeoutSlider = within(silenceTimeoutGroup).getByRole('slider');
    act(() => {
      fireEvent.keyDown(silenceTimeoutSlider, { key: 'ArrowRight' });
    });

    expect(screen.getByText('4.5s')).toBeInTheDocument();
    // The store is untouched until Save.
    expect(useVoiceInterviewStore.getState().voiceSettings.silenceTimeout).toBe(4000);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });

    expect(useVoiceInterviewStore.getState().voiceSettings.silenceTimeout).toBe(4500);
  });

  it('toggles push-to-talk and writes it to the store on save', () => {
    render(<VoiceSettingsDialog open onOpenChange={vi.fn()} />);

    const pushToTalk = screen.getByRole('switch', { name: /push to talk/i });
    act(() => {
      fireEvent.click(pushToTalk);
    });
    expect(useVoiceInterviewStore.getState().voiceSettings.pushToTalk).toBe(false);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(useVoiceInterviewStore.getState().voiceSettings.pushToTalk).toBe(true);
  });

  it('persists the edited settings as the user default on save', async () => {
    loadUserSettings.mockResolvedValue({ hintsEnabled: true });
    render(<VoiceSettingsDialog open onOpenChange={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByRole('switch', { name: /push to talk/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });

    expect(saveUserSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        hintsEnabled: true,
        defaultVoiceSettings: expect.objectContaining({ pushToTalk: true }),
      })
    );
  });

  it('offers the system voices reported by the speech service', () => {
    getVoices.mockReturnValue([
      { voiceURI: 'urn:vi-VN', name: 'Linh', lang: 'vi-VN' },
      { voiceURI: 'urn:en-US', name: 'Samantha', lang: 'en-US' },
    ]);

    render(<VoiceSettingsDialog open onOpenChange={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByRole('combobox', { name: /ai voice/i }));
    });

    act(() => {
      fireEvent.click(screen.getByRole('option', { name: /Samantha/ }));
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });

    expect(useVoiceInterviewStore.getState().voiceSettings.voiceId).toBe('urn:en-US');
  });
});
