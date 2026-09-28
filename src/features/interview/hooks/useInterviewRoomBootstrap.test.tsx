import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useInterviewRoomBootstrap } from './useInterviewRoomBootstrap';
import { emitSettingsChanged } from '@/events/settingsEvents';
import { loadUserSettings } from '@/services/core/settingsService';
import type { UserSettings } from '@/types';

vi.mock('@/lib/db', () => ({
  db: { resumes: { toArray: vi.fn().mockResolvedValue([]) } },
}));

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
}));

const mockedLoad = vi.mocked(loadUserSettings);

describe('useInterviewRoomBootstrap', () => {
  beforeEach(() => {
    mockedLoad.mockReset();
    mockedLoad.mockResolvedValue({ hintsEnabled: false } as UserSettings);
  });

  it('reloads settings live when a SETTINGS_CHANGED event fires', async () => {
    const { result } = renderHook(() => useInterviewRoomBootstrap(null, false));

    await waitFor(() => expect(result.current.userSettings.hintsEnabled).toBe(false));

    act(() => {
      emitSettingsChanged({ hintsEnabled: true, autoFinishEnabled: true } as UserSettings);
    });

    expect(result.current.userSettings.hintsEnabled).toBe(true);
    expect(result.current.userSettings.autoFinishEnabled).toBe(true);
  });
});
