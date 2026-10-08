import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncService } from './syncService';
import { db } from '@/lib/db';
import { apiClient } from '@/lib/api-client';
import LZString from 'lz-string';
import { InterviewStatus, UserSettings } from '@/types';
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
    jobs: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
    },
    job_recommendations: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
    },
    careerProfiles: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    careerFacts: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    careerEvidence: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    factEvidenceLinks: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    careerNotes: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    skillAssessments: {
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
    },
    transaction: vi.fn((...args: unknown[]) => {
      const fn = args[args.length - 1] as () => unknown;
      return fn();
    }),
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

    it('should validate email accounts', () => {
      expect(syncService.validateId('developer@example.com')).toBe(true);
      expect(syncService.validateId('user.name+sync@company.org')).toBe(true);
    });

    it('should validate usernames (3-64 characters)', () => {
      expect(syncService.validateId('john_doe-99')).toBe(true);
      expect(syncService.validateId('dev')).toBe(true);
    });

    it('should reject IDs with illegal special characters or spaces', () => {
      expect(syncService.validateId('a1b2c3d4e5f6g7h!')).toBe(false);
      expect(syncService.validateId('user @example.com')).toBe(false);
      expect(syncService.validateId('invalid#user$')).toBe(false);
    });

    it('should reject IDs with invalid length (< 3 chars)', () => {
      expect(syncService.validateId('ab')).toBe(false);
      expect(syncService.validateId('')).toBe(false);
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

    it('exports skillAssessments from local db', async () => {
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.skillAssessments.toArray).mockResolvedValue([
        {
          id: 1,
          skill: 'React',
          score: 85,
          totalQuestions: 10,
          createdAt: 12345678,
        },
      ]);

      const data = await syncService.exportData();
      expect(data.skillAssessments).toHaveLength(1);
      expect(data.skillAssessments?.[0]).toMatchObject({
        skill: 'React',
        score: 85,
        totalQuestions: 10,
      });
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

      expect(db.resumes.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Resume' }));
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

      expect(db.resumes.put).toHaveBeenCalledWith(expect.objectContaining({ title: 'New', id: 5 }));
    });

    it('does not collapse cloud resumes that share a createdAt millisecond', async () => {
      // Two CVs imported in the same tick share `createdAt`. A plain
      // `.find()` pairs both with the first local row, re-adding the second
      // as a duplicate.
      const localA = { id: 5, createdAt: 3000, updatedAt: 3000, title: 'Local A' };
      const localB = { id: 6, createdAt: 3000, updatedAt: 3000, title: 'Local B' };
      const cloudA = { id: 900, createdAt: 3000, updatedAt: 4000, title: 'Cloud A' };
      const cloudB = { id: 901, createdAt: 3000, updatedAt: 4000, title: 'Cloud B' };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([localA, localB] as any);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [],
        resumes: [cloudA, cloudB] as any,
      });

      // Each local row is updated exactly once — no re-adds, no duplicates.
      expect(db.resumes.put).toHaveBeenCalledTimes(2);
      expect(db.resumes.add).not.toHaveBeenCalled();
      expect(
        vi
          .mocked(db.resumes.put)
          .mock.calls.map((c) => (c[0] as any).id)
          .sort()
      ).toEqual([5, 6]);
    });

    it('pairs a same-millisecond resume with a distinct local row', async () => {
      const localA = { id: 5, createdAt: 3000, updatedAt: 3000, title: 'Local A' };
      const localB = { id: 6, createdAt: 3000, updatedAt: 3000, title: 'Local B' };
      const cloudA = { id: 900, createdAt: 3000, updatedAt: 4000, title: 'Cloud A' };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([localA, localB] as any);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [],
        resumes: [cloudA] as any,
      });

      expect(db.resumes.put).toHaveBeenCalledTimes(1);
      expect(db.resumes.put).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cloud A', id: 5 })
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

    it('imports skill assessments and strips local id on insert', async () => {
      const cloudAssessment = {
        id: 99,
        skill: 'TypeScript',
        score: 90,
        totalQuestions: 10,
        createdAt: 2000,
      };

      vi.mocked(db.skillAssessments.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [],
        resumes: [],
        skillAssessments: [cloudAssessment],
      });

      expect(db.skillAssessments.add).toHaveBeenCalledWith({
        skill: 'TypeScript',
        score: 90,
        totalQuestions: 10,
        createdAt: 2000,
      });
    });

    it('does not insert duplicate skill assessment if already present locally', async () => {
      const existingAssessment = {
        id: 1,
        skill: 'TypeScript',
        score: 90,
        totalQuestions: 10,
        createdAt: 2000,
      };

      vi.mocked(db.skillAssessments.toArray).mockResolvedValue([existingAssessment]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as any);

      await syncService.importData({
        interviews: [],
        userSettings: [],
        resumes: [],
        skillAssessments: [{ ...existingAssessment, id: 999 }],
      });

      expect(db.skillAssessments.add).not.toHaveBeenCalled();
    });

    it('does not let an imported baseUrl override the local endpoint', async () => {
      const local = {
        id: 1,
        apiKey: 'local-secret',
        baseUrl: 'https://my-llm.example/v1',
        updatedAt: 1000,
      };
      const malicious = {
        id: 1,
        hintsEnabled: true,
        baseUrl: 'https://attacker.example/collect',
        updatedAt: 2000,
      };

      vi.mocked(db.userSettings.toArray).mockResolvedValue([local as UserSettings]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(local),
      } as unknown as ReturnType<typeof db.userSettings.orderBy>);

      await syncService.importData({
        interviews: [],
        userSettings: [malicious as UserSettings],
        resumes: [],
      });

      const putArg = vi.mocked(db.userSettings.put).mock.calls[0][0] as Record<string, unknown>;
      // Endpoint is never taken from the import...
      expect(putArg.baseUrl).toBe('https://my-llm.example/v1');
      // ...so the local key stays pinned to the local endpoint.
      expect(putArg.apiKey).toBe('local-secret');
      // Non-sensitive settings still import.
      expect(putArg.hintsEnabled).toBe(true);
    });

    it('drops a baseUrl supplied by an imported brand-new settings record', async () => {
      // Backups are untrusted JSON, so an id can be any shape the file claims.
      const malicious = {
        id: 'foreign',
        baseUrl: 'https://attacker.example/collect',
        githubToken: 'attacker-token',
      } as unknown as UserSettings;

      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof db.userSettings.orderBy>);

      await syncService.importData({
        interviews: [],
        userSettings: [malicious],
        resumes: [],
      });

      const addArg = vi.mocked(db.userSettings.add).mock.calls[0][0] as Record<string, unknown>;
      expect(addArg).not.toHaveProperty('baseUrl');
      expect(addArg).not.toHaveProperty('githubToken');
      expect(addArg.id).toBe('foreign');
    });

    it('round-trips saved jobs and job recommendations', async () => {
      const job = {
        id: 5,
        company: 'Acme',
        jobTitle: 'Staff Eng',
        jobDescription: 'jd',
        interviewerPersona: 'friendly',
        createdAt: 1000,
        updatedAt: 1000,
      };
      const recommendation = {
        id: 7,
        interviewId: 1,
        resumeId: 2,
        title: 'Staff Eng',
        company: 'Acme',
        keyRequirements: '[]',
        createdAt: 1000,
      };

      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.jobs.toArray).mockResolvedValue([job]);
      vi.mocked(db.job_recommendations.toArray).mockResolvedValue([recommendation]);

      const exported = await syncService.exportData();
      expect(exported.jobs).toEqual([job]);
      expect(exported.jobRecommendations).toEqual([recommendation]);

      // Simulate a cleared browser, then restore the backup.
      vi.mocked(db.jobs.toArray).mockResolvedValue([]);
      vi.mocked(db.job_recommendations.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof db.userSettings.orderBy>);

      await syncService.importData(exported);

      const addedJob = vi.mocked(db.jobs.add).mock.calls[0][0] as unknown as Record<
        string,
        unknown
      >;
      expect(addedJob).toMatchObject({ company: 'Acme', jobTitle: 'Staff Eng' });
      // Local 'id' is auto-increment, so the cloud id must not be restored.
      expect(addedJob).not.toHaveProperty('id');

      const addedRec = vi.mocked(db.job_recommendations.add).mock.calls[0][0] as unknown as Record<
        string,
        unknown
      >;
      expect(addedRec).toMatchObject({ title: 'Staff Eng', company: 'Acme' });
    });

    it('imports a legacy backup that has no jobs or jobRecommendations', async () => {
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.userSettings.orderBy).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof db.userSettings.orderBy>);

      await expect(
        syncService.importData({ interviews: [], userSettings: [], resumes: [] })
      ).resolves.toBeUndefined();

      expect(db.jobs.add).not.toHaveBeenCalled();
      expect(db.job_recommendations.add).not.toHaveBeenCalled();
    });

    it('round-trips Career Knowledge entities with verification invariant preservation', async () => {
      const mockProfile = {
        id: 'p1',
        schemaVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const mockFact = {
        id: 'f1',
        profileId: 'p1',
        category: 'skill' as const,
        subject: 'TypeScript',
        claim: 'TypeScript 5',
        verificationState: 'confirmed' as const,
        origin: 'user' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const mockEvidence = {
        id: 'e1',
        profileId: 'p1',
        sourceType: 'github' as const,
        capturedAt: '2026-01-01T00:00:00.000Z',
      };
      const mockLink = { factId: 'f1', evidenceId: 'e1', relation: 'supports' as const };
      const mockNote = {
        id: 'n1',
        factId: 'f1',
        scope: 'global' as const,
        text: 'Note 1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      vi.mocked(db.careerProfiles.toArray).mockResolvedValue([mockProfile]);
      vi.mocked(db.careerFacts.toArray).mockResolvedValue([mockFact]);
      vi.mocked(db.careerEvidence.toArray).mockResolvedValue([mockEvidence]);
      vi.mocked(db.factEvidenceLinks.toArray).mockResolvedValue([mockLink]);
      vi.mocked(db.careerNotes.toArray).mockResolvedValue([mockNote]);
      vi.mocked(db.userSettings.toArray).mockResolvedValue([]);
      vi.mocked(db.interviews.toArray).mockResolvedValue([]);
      vi.mocked(db.resumes.toArray).mockResolvedValue([]);
      vi.mocked(db.jobs.toArray).mockResolvedValue([]);
      vi.mocked(db.job_recommendations.toArray).mockResolvedValue([]);

      const exported = await syncService.exportData();
      expect(exported.formatVersion).toBe(2);
      expect(exported.careerProfiles).toHaveLength(1);
      expect(exported.careerFacts).toHaveLength(1);
      expect(exported.careerEvidence).toHaveLength(1);
      expect(exported.factEvidenceLinks).toHaveLength(1);
      expect(exported.careerNotes).toHaveLength(1);

      // Now test importing it
      vi.mocked(db.careerProfiles.get).mockResolvedValue(undefined);
      vi.mocked(db.careerFacts.get).mockResolvedValue(undefined);
      vi.mocked(db.careerEvidence.get).mockResolvedValue(undefined);
      vi.mocked(db.factEvidenceLinks.get).mockResolvedValue(undefined);
      vi.mocked(db.careerNotes.get).mockResolvedValue(undefined);

      await syncService.importData(exported);

      expect(db.careerProfiles.add).toHaveBeenCalledWith(mockProfile);
      expect(db.careerFacts.add).toHaveBeenCalledWith(mockFact);
      expect(db.careerEvidence.add).toHaveBeenCalledWith(mockEvidence);
      expect(db.factEvidenceLinks.put).toHaveBeenCalledWith(mockLink);
      expect(db.careerNotes.add).toHaveBeenCalledWith(mockNote);
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
