import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveUserSettings } from './settingsService';
import { db } from '@/lib/db';
import { UserSettings } from '@/types';

// Mock the db module
vi.mock('@/lib/db', () => {
  const mockTable = {
    orderBy: vi.fn().mockReturnThis(),
    first: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    toArray: vi.fn(),
  };
  return {
    db: {
      userSettings: mockTable,
    },
  };
});

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

  describe('saveUserSettings', () => {
    it('should persist all UserSettings fields to the database', async () => {
      const fullSettings: UserSettings = {
        hintsEnabled: true,
        autoFinishEnabled: true,
        forceToolsEnabled: true,
        apiKey: 'test-api-key',
        githubUsername: 'test-user',
        githubToken: 'test-token',
        defaultModel: 'test-model',
        baseUrl: 'https://test.api',
        provider: 'openai',
        maxRetries: 5,
        retryDelay: 1000,
        retryOnTimeout: true,
        retryOnRateLimit: true,
        defaultVoiceSettings: {
          voiceId: 'test-voice',
          speechRate: 1.2,
          pitch: 1.0,
          language: 'en-US',
          sttProvider: 'web-speech',
          ttsProvider: 'web-speech',
          volume: 1,
          autoPlayResponse: true,
          pushToTalk: false,
          silenceTimeout: 1000,
        },
        googleCloudApiKey: 'google-key',
        elevenLabsApiKey: 'eleven-key',
        deepgramApiKey: 'deepgram-key',
      };

      // Mock DB behavior
      (db.userSettings.orderBy as any)().first.mockResolvedValue(null);
      (db.userSettings.add as any).mockResolvedValue(1);

      await saveUserSettings(fullSettings);

      // Verify DB record
      expect(db.userSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          hintsEnabled: true,
          autoFinishEnabled: true,
          forceToolsEnabled: true,
          apiKey: 'test-api-key',
          githubUsername: 'test-user',
          githubToken: 'test-token',
          defaultModel: 'test-model',
          baseUrl: 'https://test.api',
          provider: 'openai',
          maxRetries: 5,
          retryDelay: 1000,
          retryOnTimeout: true,
          retryOnRateLimit: true,
          defaultVoiceSettings: expect.objectContaining({
            voiceId: 'test-voice',
          }),
          googleCloudApiKey: 'google-key',
          elevenLabsApiKey: 'eleven-key',
          deepgramApiKey: 'deepgram-key',
        })
      );
    });

    it('should NOT drop forceToolsEnabled and retry fields', async () => {
      const settings: UserSettings = {
        forceToolsEnabled: true,
        maxRetries: 3,
      };

      (db.userSettings.orderBy as any)().first.mockResolvedValue(null);
      (db.userSettings.add as any).mockResolvedValue(1);

      await saveUserSettings(settings);

      // Verify DB record - this WILL FAIL on current code because it drops these fields
      expect(db.userSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          forceToolsEnabled: true,
          maxRetries: 3,
        })
      );
    });

    it('should NOT drop voice settings and keys', async () => {
      const settings: UserSettings = {
        googleCloudApiKey: 'g-key',
        elevenLabsApiKey: 'e-key',
        deepgramApiKey: 'd-key',
        defaultVoiceSettings: {
          voiceId: 'v1',
          speechRate: 1,
          pitch: 1,
          language: 'en-US',
          sttProvider: 'web-speech',
          ttsProvider: 'web-speech',
          volume: 1,
          autoPlayResponse: true,
          pushToTalk: false,
          silenceTimeout: 1000,
        },
      };

      (db.userSettings.orderBy as any)().first.mockResolvedValue(null);
      (db.userSettings.add as any).mockResolvedValue(1);

      await saveUserSettings(settings);

      // Verify DB record - this WILL FAIL on current code because it drops these fields
      expect(db.userSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          googleCloudApiKey: 'g-key',
          elevenLabsApiKey: 'e-key',
          deepgramApiKey: 'd-key',
          defaultVoiceSettings: expect.anything(),
        })
      );
    });

    it('should preserve existing ID during update (FIX 1)', async () => {
      const existingRecord = { id: 1, provider: 'google' };
      const newSettings: UserSettings = {
        maxRetries: 5,
        retryDelay: 1000,
        provider: 'openai',
        defaultVoiceSettings: {
          voiceId: 'v1',
          speechRate: 1,
          pitch: 1,
          language: 'en-US',
          sttProvider: 'web-speech',
          ttsProvider: 'web-speech',
          volume: 1,
          autoPlayResponse: true,
          pushToTalk: false,
          silenceTimeout: 1000,
        },
      };

      (db.userSettings.orderBy as any)().first.mockResolvedValue(existingRecord);
      (db.userSettings.update as any).mockResolvedValue(1);

      await saveUserSettings(newSettings);

      expect(db.userSettings.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          maxRetries: 5,
          retryDelay: 1000,
          provider: 'openai',
          defaultVoiceSettings: expect.objectContaining({ voiceId: 'v1' }),
        })
      );
    });

    it('should preserve provider in SettingsModal-style flow and direct save (FIX 2)', async () => {
      // Test A: SettingsModal-style flow (update)
      const existingRecord = { id: 1, provider: 'openrouter' as const };
      const settingsFromModal: UserSettings = {
        ...existingRecord,
        hintsEnabled: true,
        // Provider is preserved from loaded state
      };

      (db.userSettings.orderBy as any)().first.mockResolvedValue(existingRecord);
      (db.userSettings.update as any).mockResolvedValue(1);

      await saveUserSettings(settingsFromModal);

      expect(db.userSettings.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          provider: 'openrouter',
          hintsEnabled: true,
        })
      );

      // Test B: Direct service-level save (add)
      const directSettings: UserSettings = {
        provider: 'openrouter',
        apiKey: 'test-key',
      };

      (db.userSettings.orderBy as any)().first.mockResolvedValue(null);
      (db.userSettings.add as any).mockResolvedValue(2);

      await saveUserSettings(directSettings);

      expect(db.userSettings.add).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openrouter',
        })
      );
    });
  });
});
