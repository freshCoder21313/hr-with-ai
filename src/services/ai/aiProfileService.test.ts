import { describe, it, expect } from 'vitest';
import { 
  migrateLegacySettings, 
  normalizeUserSettings, 
  getActiveProfileConfig, 
  LEGACY_DEFAULT_ID,
  toSafeSyncProfiles,
  mergeImportedProfiles
} from './aiProfileService';
import { UserSettings, AIProviderProfile } from '@/types';

// Mock crypto.randomUUID
if (!global.crypto) {
  (global as any).crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = (() => 'test-uuid-' + Math.random()) as any;
}

describe('aiProfileService', () => {
  describe('migrateLegacySettings', () => {
    it('should migrate legacy settings to a default profile', () => {
      const legacySettings: UserSettings = {
        apiKey: 'test-key',
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
        defaultModel: 'gpt-4',
      };

      const migrated = migrateLegacySettings(legacySettings);

      expect(migrated.aiProfiles).toHaveLength(1);
      expect(migrated.aiProfiles![0]).toMatchObject({
        id: LEGACY_DEFAULT_ID,
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com',
        modelIds: ['gpt-4'],
        enabled: true,
      });
      expect(migrated.activeAIProfileId).toBe(LEGACY_DEFAULT_ID);
    });

    it('should be idempotent', () => {
      const settingsWithProfiles: UserSettings = {
        aiProfiles: [{
          id: 'existing-id',
          name: 'Existing',
          provider: 'google',
          apiKey: 'key',
          modelIds: [],
          enabled: true
        }],
        activeAIProfileId: 'existing-id'
      };

      const result = migrateLegacySettings(settingsWithProfiles);
      expect(result.aiProfiles).toHaveLength(1);
      expect(result.aiProfiles![0].id).toBe('existing-id');
    });
  });

  describe('normalizeUserSettings', () => {
    it('should enforce unique names case-insensitively', () => {
      const settings: UserSettings = {
        aiProfiles: [
          { id: '1', name: 'Profile', provider: 'google', apiKey: '', modelIds: [], enabled: true },
          { id: '2', name: 'profile', provider: 'google', apiKey: '', modelIds: [], enabled: true },
          { id: '3', name: 'PROFILE', provider: 'google', apiKey: '', modelIds: [], enabled: true },
        ]
      };

      const normalized = normalizeUserSettings(settings);
      expect(normalized.aiProfiles![0].name).toBe('Profile');
      expect(normalized.aiProfiles![1].name).toBe('profile 1');
      expect(normalized.aiProfiles![2].name).toBe('PROFILE 2');
    });

    it('should ensure active profile exists and is enabled', () => {
      const settings: UserSettings = {
        aiProfiles: [
          { id: '1', name: 'P1', provider: 'google', apiKey: '', modelIds: [], enabled: false },
          { id: '2', name: 'P2', provider: 'google', apiKey: '', modelIds: [], enabled: true },
        ],
        activeAIProfileId: '1'
      };

      const normalized = normalizeUserSettings(settings);
      expect(normalized.activeAIProfileId).toBe('2');
    });

    it('should filter fallback list', () => {
      const settings: UserSettings = {
        aiProfiles: [
          { id: 'active', name: 'Active', provider: 'google', apiKey: '', modelIds: [], enabled: true },
          { id: 'f1', name: 'F1', provider: 'google', apiKey: '', modelIds: [], enabled: true },
          { id: 'f2', name: 'F2', provider: 'google', apiKey: '', modelIds: [], enabled: false },
          { id: 'f3', name: 'F3', provider: 'google', apiKey: '', modelIds: [], enabled: true },
        ],
        activeAIProfileId: 'active',
        aiFallbackProfileIds: ['active', 'f1', 'f2', 'f3', 'non-existent', 'f1']
      };

      const normalized = normalizeUserSettings(settings);
      expect(normalized.aiFallbackProfileIds).toEqual(['f1', 'f3']);
    });
  });

  describe('getActiveProfileConfig', () => {
    it('should return active config marker', () => {
      const settings: UserSettings = {
        aiProfiles: [
          { id: '1', name: 'P1', provider: 'openai', apiKey: 'key', modelIds: ['m1'], enabled: true },
        ],
        activeAIProfileId: '1'
      };

      const config = getActiveProfileConfig(settings);
      expect(config).toEqual({
        apiKey: 'key',
        baseUrl: undefined,
        modelId: 'm1',
        provider: 'openai',
        profileId: '1',
        source: 'active-profile'
      });
    });
  });

  describe('Sync Safety', () => {
    const mockProfiles: AIProviderProfile[] = [
      { id: '1', name: 'P1', provider: 'google', apiKey: 'secret-1', modelIds: [], enabled: true },
      { id: '2', name: 'P2', provider: 'openai', apiKey: 'secret-2', modelIds: [], enabled: true }
    ];

    it('toSafeSyncProfiles should strip apiKey', () => {
      const safe = toSafeSyncProfiles(mockProfiles);
      expect(safe[0]).not.toHaveProperty('apiKey');
      expect(safe[1]).not.toHaveProperty('apiKey');
      expect(safe[0].id).toBe('1');
    });

    it('mergeImportedProfiles should preserve local keys for matching IDs', () => {
      const imported: AIProviderProfile[] = [
        { id: '1', name: 'P1-Updated', provider: 'google', apiKey: '', modelIds: ['new-model'], enabled: true }
      ];
      
      const merged = mergeImportedProfiles(mockProfiles, imported);
      expect(merged).toHaveLength(2);
      expect(merged[0].id).toBe('1');
      expect(merged[0].apiKey).toBe('secret-1');
      expect(merged[0].modelIds).toContain('new-model');
    });

    it('mergeImportedProfiles should disable new profiles with no key', () => {
      const imported: AIProviderProfile[] = [
        { id: 'new', name: 'New', provider: 'anthropic', apiKey: '', modelIds: [], enabled: true }
      ];
      
      const merged = mergeImportedProfiles(mockProfiles, imported);
      const newProfile = merged.find(p => p.id === 'new');
      expect(newProfile).toBeDefined();
      expect(newProfile?.apiKey).toBe('');
      expect(newProfile?.enabled).toBe(false);
    });
  });
});
