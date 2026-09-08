import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncService } from './syncService';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    interviews: { toArray: vi.fn(), add: vi.fn(), put: vi.fn() },
    userSettings: { toArray: vi.fn(), add: vi.fn(), put: vi.fn(), orderBy: vi.fn() },
    resumes: { toArray: vi.fn(), add: vi.fn(), put: vi.fn() },
    transaction: vi.fn((_mode, _t1, _t2, _t3, fn) => fn()),
  },
}));

describe('syncService Profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportData', () => {
    it('safe export should strip apiKey from nested aiProfiles', async () => {
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([
        {
          id: 1,
          aiProfiles: [
            { id: '1', name: 'P1', provider: 'google' as const, apiKey: 'secret', modelIds: [], enabled: true }
          ]
        },
      ]);

      const data = await syncService.exportData({ includeSensitive: false });
      expect(data.userSettings[0].aiProfiles![0]).not.toHaveProperty('apiKey');
      expect(data.userSettings[0].aiProfiles![0].name).toBe('P1');
    });
  });

  describe('importData', () => {
    it('safe import should preserve matching local apiKey', async () => {
      const local = {
        id: 1,
        aiProfiles: [{ id: '1', name: 'P1', provider: 'google' as const, apiKey: 'local-secret', modelIds: [], enabled: true }],
        updatedAt: 1000,
      } as any;
      const cloud = {
        id: 1,
        aiProfiles: [{ id: '1', name: 'P1-Cloud', provider: 'google' as const, apiKey: '', modelIds: ['new'], enabled: true }],
        updatedAt: 2000,
      } as any;

      vi.mocked(db.userSettings.toArray).mockResolvedValue([local]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(local),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [cloud],
        resumes: [],
      });

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          aiProfiles: expect.arrayContaining([
            expect.objectContaining({ id: '1', apiKey: 'local-secret', name: 'P1-Cloud' })
          ])
        })
      );
    });

    it('safe import should disable new profile with no key', async () => {
      const local = { id: 1, aiProfiles: [], updatedAt: 1000 } as any;
      const cloud = {
        id: 1,
        aiProfiles: [{ id: 'new', name: 'New', provider: 'openai' as const, apiKey: '', modelIds: [], enabled: true }],
        updatedAt: 2000,
      } as any;

      vi.mocked(db.userSettings.toArray).mockResolvedValue([local]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(local),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [cloud],
        resumes: [],
      });

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          aiProfiles: expect.arrayContaining([
            expect.objectContaining({ id: 'new', apiKey: '', enabled: false })
          ])
        })
      );
    });
  });
});
