import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveUserSettings,
  loadUserSettings,
  getSetting,
  updateSetting,
  loadSettingsSync,
  subscribeToSettings,
} from './settingsService';
import { db } from '@/lib/db';
import { UserSettings } from '@/types';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/lib/db', () => {
  const mockTable = {
    orderBy: vi.fn().mockReturnThis(),
    first: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
  };
  return {
    db: {
      userSettings: mockTable,
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/services/ai/aiProfileService', () => ({
  migrateLegacySettings: vi.fn((s) => s),
  mirrorActiveProfileToLocalStorage: vi.fn(),
  normalizeUserSettings: vi.fn((s) => s),
}));

describe('settingsService', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => mockLocalStorage[key] || null),
        setItem: vi.fn((key, value) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadUserSettings', () => {
    it('loads from DB and merges with localStorage', async () => {
      const dbSettings = { id: 1, hintsEnabled: true, apiKey: '' };
      localStorage.setItem('gemini_api_key', 'local-key');
      
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue(dbSettings);
      
      const result = await loadUserSettings();
      
      expect(result.hintsEnabled).toBe(true);
      expect(result.apiKey).toBe('local-key');
    });

    it('returns defaults + localStorage if DB is empty', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue(null);
      localStorage.setItem('gemini_api_key', 'local-key');
      
      const result = await loadUserSettings();
      
      expect(result.hintsEnabled).toBe(false); // default
      expect(result.apiKey).toBe('local-key');
    });

    it('falls back to localStorage only on DB error', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockRejectedValue(new Error('DB Error'));
      localStorage.setItem('gemini_api_key', 'fallback-key');
      
      const result = await loadUserSettings();
      
      expect(logger.error).toHaveBeenCalled();
      expect(result.apiKey).toBe('fallback-key');
    });

    it('handles concurrent migration calls', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 1 }), 50))
      );
      
      const p1 = loadUserSettings();
      const p2 = loadUserSettings();
      
      const [r1, r2] = await Promise.all([p1, p2]);
      
      expect(r1).toEqual(r2);
    });
  });

  describe('saveUserSettings', () => {
    it('updates existing record if id exists', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue({ id: 123 });
      
      const settings = { hintsEnabled: true } as UserSettings;
      await saveUserSettings(settings);
      
      expect(db.userSettings.update).toHaveBeenCalledWith(123, expect.objectContaining({ hintsEnabled: true }));
    });

    it('adds new record if no id exists', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue(null);
      vi.mocked(db.userSettings.add).mockResolvedValue(456);
      
      const settings = { hintsEnabled: true } as UserSettings;
      const result = await saveUserSettings(settings);
      
      expect(db.userSettings.add).toHaveBeenCalled();
      expect(result.id).toBe(456);
    });

    it('logs and rethrows on error', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockRejectedValue(new Error('Save Error'));
      
      await expect(saveUserSettings({} as any)).rejects.toThrow('Save Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getSetting & updateSetting', () => {
    it('gets a specific setting', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue({ hintsEnabled: true });
      const val = await getSetting('hintsEnabled');
      expect(val).toBe(true);
    });

    it('updates a specific setting', async () => {
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue({ id: 1, hintsEnabled: false });
      await updateSetting('hintsEnabled', true);
      expect(db.userSettings.update).toHaveBeenCalledWith(1, expect.objectContaining({ hintsEnabled: true }));
    });
  });

  describe('loadSettingsSync', () => {
    it('reads from localStorage synchronously', () => {
      localStorage.setItem('gemini_api_key', 'sync-key');
      localStorage.setItem('custom_base_url', 'sync-url');
      
      const settings = loadSettingsSync();
      
      expect(settings.apiKey).toBe('sync-key');
      expect(settings.baseUrl).toBe('sync-url');
    });
  });

  describe('subscribeToSettings', () => {
    it('periodically calls callback with updated settings', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue({ id: 1, hintsEnabled: true });
      
      const unsubscribe = subscribeToSettings(callback);
      
      await vi.advanceTimersByTimeAsync(0);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ hintsEnabled: true }));
      
      vi.mocked((db.userSettings.orderBy('id') as any).first).mockResolvedValue({ id: 1, hintsEnabled: false });
      await vi.advanceTimersByTimeAsync(2000);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ hintsEnabled: false }));
      
      unsubscribe();
      vi.useRealTimers();
    });
  });
});
