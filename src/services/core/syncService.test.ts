import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncService } from './syncService';
import { db } from '@/lib/db';
import { apiClient } from '@/lib/api-client';
import LZString from 'lz-string';
import { InterviewStatus } from '@/types';
import axios from 'axios';

vi.mock('@/lib/db', () => ({
  db: {
    interviews: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
    },
    userSettings: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      orderBy: vi.fn(),
    },
    resumes: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
    },
    transaction: vi.fn((_mode, _t1, _t2, _t3, fn) => fn()),
  },
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('syncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateId', () => {
    it('should validate valid 16-char alphanumeric IDs', () => {
      expect(syncService.validateId('a1b2c3d4e5f6g7h8')).toBe(true);
    });

    it('should reject IDs with special characters', () => {
      expect(syncService.validateId('a1b2c3d4e5f6g7h!')).toBe(false);
    });

    it('should reject IDs with incorrect length', () => {
      expect(syncService.validateId('a1b2c3')).toBe(false);
      expect(syncService.validateId('a1b2c3d4e5f6g7h8i9j0')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate a valid 16-char alphanumeric ID', () => {
      const id = syncService.generateId();
      expect(id).toHaveLength(16);
      expect(syncService.validateId(id)).toBe(true);
    });

    it('should generate unique IDs across calls', () => {
      const a = syncService.generateId();
      const b = syncService.generateId();
      expect(a).not.toBe(b);
    });
  });

  describe('exportData', () => {
    it('strips sensitive keys by default', async () => {
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([
        {
          id: 1,
          apiKey: 'secret-key',
          githubToken: 'gh-token',
          githubUsername: 'user',
          googleCloudApiKey: 'g',
          elevenLabsApiKey: 'e',
          deepgramApiKey: 'd',
          hintsEnabled: true,
        },
      ]);

      const data = await syncService.exportData();
      expect(data.userSettings).toHaveLength(1);
      expect(data.userSettings[0]).not.toHaveProperty('apiKey');
      expect(data.userSettings[0]).not.toHaveProperty('githubToken');
      expect(data.userSettings[0]).toMatchObject({ hintsEnabled: true });
    });

    it('includes sensitive keys when requested', async () => {
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([
        { id: 1, apiKey: 'secret-key', hintsEnabled: false },
      ]);

      const data = await syncService.exportData({ includeSensitive: true });
      expect(data.userSettings[0].apiKey).toBe('secret-key');
    });
  });

  describe('importData', () => {
    it('adds new interviews and preserves local id on update', async () => {
      const localInterview = {
        id: 10,
        createdAt: 1000,
        updatedAt: 1000,
        company: 'Local',
        jobTitle: 'Dev',
        interviewerPersona: 'p',
        jobDescription: 'jd',
        resumeText: 'r',
        language: 'en-US' as const,
        status: InterviewStatus.IN_PROGRESS,
        messages: [],
      };
      const newerCloud = {
        ...localInterview,
        id: 99,
        company: 'Cloud',
        updatedAt: 2000,
      };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([localInterview]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof db.userSettings.orderBy>);

      await syncService.importData({
        interviews: [newerCloud],
        userSettings: [],
        resumes: [],
      });

      expect(db.interviews.put).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Cloud', id: 10 })
      );
    });

    it('preserves local API keys when cloud settings omit them', async () => {
      const local = {
        id: 1,
        apiKey: 'local-secret',
        updatedAt: 1000,
      };
      const cloud = {
        id: 1,
        hintsEnabled: true,
        updatedAt: 2000,
      };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([local]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue({ ...cloud, apiKey: 'local-secret' }),
      } as unknown as ReturnType<typeof db.userSettings.orderBy>);

      await syncService.importData({
        interviews: [],
        userSettings: [cloud],
        resumes: [],
      });

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          hintsEnabled: true,
          apiKey: 'local-secret',
        })
      );
    });
  });

  describe('uploadToCloud', () => {
    it('compresses payload and posts to API', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});
      const payload = { interviews: [], userSettings: [], resumes: [] };

      const result = await syncService.uploadToCloud('abcdefghijklmnop', 'pass', payload);

      expect(result.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/sync',
        expect.objectContaining({
          password: 'pass',
          data: expect.objectContaining({ compressed: expect.any(String) }),
        }),
        expect.objectContaining({
          headers: { 'x-sync-id': 'abcdefghijklmnop' },
        })
      );
    });

    it('maps 401 to invalid password message', async () => {
      const err = {
        isAxiosError: true,
        response: { status: 401, statusText: 'Unauthorized' },
        message: 'Request failed',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(apiClient.post).mockRejectedValue(err);

      const result = await syncService.uploadToCloud('abcdefghijklmnop', 'bad', {
        interviews: [],
        userSettings: [],
        resumes: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Invalid password/i);
    });
  });

  describe('downloadFromCloud', () => {
    it('decompresses base64 payload', async () => {
      const original = {
        interviews: [
          {
            createdAt: 1,
            company: 'X',
            jobTitle: 'Y',
            interviewerPersona: 'p',
            jobDescription: 'jd',
            resumeText: 'r',
            language: 'en-US' as const,
            status: InterviewStatus.CREATED,
            messages: [],
          },
        ],
        userSettings: [],
        resumes: [],
      };
      const compressed = LZString.compressToBase64(JSON.stringify(original));
      vi.mocked(apiClient.get).mockResolvedValue({ data: { compressed } });

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');

      expect(result.success).toBe(true);
      expect(result.data?.interviews[0].company).toBe('X');
    });

    it('maps 404 to not found message', async () => {
      const err = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' },
        message: 'Request failed',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(apiClient.get).mockRejectedValue(err);

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not found/i);
    });
  });
});
