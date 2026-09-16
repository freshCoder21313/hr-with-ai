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
        } as any,
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
        { id: 1, apiKey: 'secret-key', hintsEnabled: false } as any,
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
      } as any);

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

      vi.mocked(db.userSettings.toArray).mockResolvedValue([local as any]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue({ ...cloud, apiKey: 'local-secret' }),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [cloud as any],
        resumes: [],
      });

      expect(db.userSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          hintsEnabled: true,
          apiKey: 'local-secret',
        })
      );
    });

    it('does not update if cloud version is older', async () => {
      const local = { id: 1, updatedAt: 2000 };
      const olderCloud = { id: 1, updatedAt: 1000 };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([local as any]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(local),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [olderCloud as any],
        resumes: [],
      });

      expect(db.userSettings.put).not.toHaveBeenCalled();
    });

    it('adds new resumes', async () => {
      const cloudResume = {
        createdAt: 3000,
        updatedAt: 3000,
        title: 'New Resume',
        fileName: 'resume.pdf',
        rawText: 'text',
        content: {},
      };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [],
        resumes: [cloudResume as any],
      });

      expect(db.resumes.add).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Resume' })
      );
    });

    it('updates existing resumes if cloud is newer', async () => {
      const localResume = {
        id: 5,
        createdAt: 3000,
        updatedAt: 3000,
        title: 'Old',
        fileName: 'f',
        rawText: 't',
      };
      const newerCloud = { ...localResume, title: 'New', updatedAt: 4000 };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([localResume as any]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [],
        resumes: [newerCloud as any],
      });

      expect(db.resumes.put).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New', id: 5 })
      );
    });

    it('adds new interviews when no match is found', async () => {
      const cloudInterview = {
        createdAt: 5000,
        company: 'Brand New',
        status: InterviewStatus.CREATED,
      };

      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [cloudInterview as any],
        userSettings: [],
        resumes: [],
      });

      expect(db.interviews.add).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Brand New' })
      );
    });

    it('adds new settings when no match is found', async () => {
      const cloudSetting = { id: 'new-id', theme: 'dark' };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [cloudSetting as any],
        resumes: [],
      });

      expect(db.userSettings.add).toHaveBeenCalledWith(cloudSetting);
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

    it('uses error message if statusText is missing on upload', async () => {
      const err = {
        isAxiosError: true,
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(apiClient.post).mockRejectedValue(err);

      const result = await syncService.uploadToCloud('id', 'pass', {
        interviews: [],
        userSettings: [],
        resumes: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Upload failed: Internal Server Error');
    });

    it('maps 429 to rate limit message', async () => {
      const err = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' },
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(apiClient.post).mockRejectedValue(err);

      const result = await syncService.uploadToCloud('abcdefghijklmnop', 'pass', {
        interviews: [],
        userSettings: [],
        resumes: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Rate limit/i);
    });

    it('handles generic Error during upload', async () => {
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      const result = await syncService.uploadToCloud('abcdefghijklmnop', 'pass', {
        interviews: [],
        userSettings: [],
        resumes: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
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

    it('falls back to UTF16 decompression', async () => {
      const original = { interviews: [], userSettings: [], resumes: [] };
      const compressed = LZString.compressToUTF16(JSON.stringify(original));
      vi.mocked(apiClient.get).mockResolvedValue({ data: { compressed } });

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(original);
    });

    it('handles legacy uncompressed data', async () => {
      const original = { interviews: [], userSettings: [], resumes: [] };
      vi.mocked(apiClient.get).mockResolvedValue({ data: original });

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(original);
    });

    it('throws error if decompression fails', async () => {
      // LZString returns null or empty string on failed decompression
      vi.mocked(apiClient.get).mockResolvedValue({ data: { compressed: '!!!' } });

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to decompress data');
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

    it('uses error message if statusText is missing on download', async () => {
      const err = {
        isAxiosError: true,
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(apiClient.get).mockRejectedValue(err);

      const result = await syncService.downloadFromCloud('id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Download failed: Internal Server Error');
    });

    it('maps 429 to rate limit message', async () => {
      const err = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' },
      };
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      vi.mocked(apiClient.get).mockRejectedValue(err);

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Rate limit/i);
    });

    it('handles generic Error during download', async () => {
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await syncService.downloadFromCloud('abcdefghijklmnop');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });
});
