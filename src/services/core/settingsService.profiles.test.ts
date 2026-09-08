import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadUserSettings, saveUserSettings } from './settingsService';
import { db } from '@/lib/db';
import { UserSettings } from '@/types';
import { LEGACY_DEFAULT_ID } from '@/services/ai/aiProfileService';

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
      transaction: vi.fn((_mode, _t1, _t2, _t3, fn) => fn()),
    },
  };
});

describe('settingsService Profiles', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => mockLocalStorage[key] || null),
        setItem: vi.fn((key, value) => { mockLocalStorage[key] = value; }),
        removeItem: vi.fn((key) => { delete mockLocalStorage[key]; }),
        clear: vi.fn(() => { Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]); }),
      },
      writable: true,
    });
  });

  it('loadUserSettings should migrate legacy localStorage if no DB record', async () => {
    mockLocalStorage['gemini_api_key'] = 'legacy-key';
    mockLocalStorage['ai_provider'] = 'openai';
    
    (db.userSettings.orderBy as any)().first.mockResolvedValue(null);
    (db.userSettings.add as any).mockResolvedValue(1);

    const settings = await loadUserSettings();

    expect(settings.aiProfiles).toHaveLength(1);
    expect(settings.aiProfiles![0].apiKey).toBe('legacy-key');
    expect(settings.activeAIProfileId).toBe(LEGACY_DEFAULT_ID);
    expect(db.userSettings.add).toHaveBeenCalled();
    expect(mockLocalStorage['ai_active_profile_id']).toBe(LEGACY_DEFAULT_ID);
  });

  it('saveUserSettings should mirror active profile to localStorage', async () => {
    const settings: UserSettings = {
      aiProfiles: [
        { id: 'p1', name: 'P1', provider: 'anthropic', apiKey: 'ant-key', modelIds: ['claude-3'], enabled: true }
      ],
      activeAIProfileId: 'p1'
    };

    (db.userSettings.orderBy as any)().first.mockResolvedValue({ id: 1 });
    (db.userSettings.update as any).mockResolvedValue(1);

    await saveUserSettings(settings);

    expect(mockLocalStorage['gemini_api_key']).toBe('ant-key');
    expect(mockLocalStorage['ai_provider']).toBe('anthropic');
    expect(mockLocalStorage['custom_model_id']).toBe('claude-3');
    expect(mockLocalStorage['ai_active_profile_id']).toBe('p1');
  });

  it('loadUserSettings should reconcile mirror from DB', async () => {
    const stored = {
      id: 1,
      aiProfiles: [
        { id: 'db-p', name: 'DB', provider: 'google', apiKey: 'db-key', modelIds: ['gemini-pro'], enabled: true }
      ],
      activeAIProfileId: 'db-p'
    };
    
    (db.userSettings.orderBy as any)().first.mockResolvedValue(stored);
    mockLocalStorage['gemini_api_key'] = 'wrong-key';

    const settings = await loadUserSettings();

    expect(settings.activeAIProfileId).toBe('db-p');
    expect(mockLocalStorage['gemini_api_key']).toBe('db-key');
  });
});
