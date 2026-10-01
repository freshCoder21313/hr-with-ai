import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCloudSync } from './useCloudSync';
import { syncService } from '@/services/core/syncService';

vi.mock('@/services/core/syncService', () => ({
  syncService: {
    generateId: vi.fn(() => 'abcd1234abcd1234'),
    validateId: vi.fn(() => true),
    exportData: vi.fn(),
    uploadToCloud: vi.fn(),
    downloadFromCloud: vi.fn(),
    importData: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const reload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload },
  writable: true,
});

function pickFile(contents: string) {
  // jsdom's File has no text(); syncService reads the file through it.
  const file = { name: 'backup.json', text: async () => contents };
  return { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe('useCloudSync offline import errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports unparseable files as a JSON problem, not a database failure', async () => {
    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.actions.handleFileChange(pickFile('{ not json'));
    });

    await waitFor(() => expect(result.current.state.error).toBeTruthy());
    expect(result.current.state.error).toMatch(/not valid JSON/i);
    expect(result.current.state.error).not.toMatch(/applying|merge/i);
    expect(syncService.importData).not.toHaveBeenCalled();
  });

  it('separates a valid file whose data fails to merge, and names the cause', async () => {
    vi.mocked(syncService.importData).mockRejectedValue(new Error('quota exceeded'));
    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.actions.handleFileChange(pickFile('{"version":1}'));
    });

    await waitFor(() => expect(result.current.state.error).toBeTruthy());
    expect(result.current.state.error).toContain('quota exceeded');
    expect(result.current.state.error).not.toMatch(/not valid JSON/i);
  });

  it('does not claim the import was rolled back', async () => {
    vi.mocked(syncService.importData).mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.actions.handleFileChange(pickFile('{"version":1}'));
    });

    await waitFor(() => expect(result.current.state.error).toBeTruthy());
    expect(result.current.state.error).not.toMatch(/roll ?back|unchanged|nothing was saved/i);
  });

  it('clears the stale error once the user starts another action', async () => {
    vi.mocked(syncService.importData).mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.actions.handleFileChange(pickFile('{"version":1}'));
    });
    await waitFor(() => expect(result.current.state.error).toBeTruthy());

    act(() => result.current.actions.resetStatus());

    expect(result.current.state.error).toBeNull();
  });
});
