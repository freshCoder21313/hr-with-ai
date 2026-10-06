import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { apiClient } from '@/lib/api-client';
import { careerKnowledgeSyncService, type CareerKnowledgeSyncData } from './syncService';
import { careerKnowledgeRepository } from './repository';
import type { CareerFact } from '@/types/careerKnowledge';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('CareerKnowledgeSyncService', () => {
  const SYNC_ID = 'TestSyncId123456';
  const PASSWORD = 'test-password-123';
  const PROFILE_ID = 'prof-test-1';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear Dexie Career Knowledge tables
    await db.transaction(
      'rw',
      [db.careerProfiles, db.careerFacts, db.careerEvidence, db.factEvidenceLinks, db.careerNotes],
      async () => {
        await db.careerProfiles.clear();
        await db.careerFacts.clear();
        await db.careerEvidence.clear();
        await db.factEvidenceLinks.clear();
        await db.careerNotes.clear();
      }
    );
  });

  describe('exportProfileData', () => {
    it('returns null if the profile does not exist in local Dexie', async () => {
      const data = await careerKnowledgeSyncService.exportProfileData('non-existent');
      expect(data).toBeNull();
    });

    it('exports complete local Career Knowledge dataset for a profile', async () => {
      // 1. Create local profile and entities
      await careerKnowledgeRepository.createProfile({
        id: () => PROFILE_ID,
        now: () => '2026-10-01T10:00:00.000Z',
      });

      const fact = await careerKnowledgeRepository.createFact(
        {
          profileId: PROFILE_ID,
          category: 'skill',
          subject: 'React',
          claim: 'Senior React Developer with 6 years experience',
          origin: 'user',
          verificationState: 'needs_confirmation',
        },
        {
          id: () => 'fact-1',
          now: () => '2026-10-01T10:05:00.000Z',
        }
      );

      const evidence = await careerKnowledgeRepository.createEvidence(
        {
          profileId: PROFILE_ID,
          sourceType: 'github',
          sourceRef: 'repo/a',
        },
        {
          id: () => 'ev-1',
          now: () => '2026-10-01T10:10:00.000Z',
        }
      );

      const link = await careerKnowledgeRepository.linkEvidenceToFact('fact-1', 'ev-1', 'supports');

      const note = await careerKnowledgeRepository.createNote(
        {
          factId: 'fact-1',
          text: 'Key architectural skill',
        },
        {
          id: () => 'note-1',
          now: () => '2026-10-01T10:15:00.000Z',
        }
      );

      // 2. Export
      const exported = await careerKnowledgeSyncService.exportProfileData(PROFILE_ID);

      expect(exported).not.toBeNull();
      expect(exported?.profile.id).toBe(PROFILE_ID);
      expect(exported?.facts).toEqual([fact]);
      expect(exported?.evidence).toEqual([evidence]);
      expect(exported?.links).toEqual([link]);
      expect(exported?.notes).toEqual([note]);
    });
  });

  describe('importProfileData', () => {
    const cloudPayload: CareerKnowledgeSyncData = {
      profile: {
        id: PROFILE_ID,
        schemaVersion: 1,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
      facts: [
        {
          id: 'fact-1',
          profileId: PROFILE_ID,
          category: 'skill',
          subject: 'TypeScript',
          claim: 'TypeScript Expert',
          verificationState: 'confirmed',
          origin: 'user',
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
      ],
      evidence: [
        {
          id: 'ev-1',
          profileId: PROFILE_ID,
          sourceType: 'github',
          sourceRef: 'repo/1',
          capturedAt: '2026-10-01T10:00:00.000Z',
        },
      ],
      links: [
        {
          factId: 'fact-1',
          evidenceId: 'ev-1',
          relation: 'supports',
        },
      ],
      notes: [
        {
          id: 'note-1',
          factId: 'fact-1',
          scope: 'global',
          text: 'Note 1',
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
      ],
    };

    it('imports brand new cloud data into an empty local database', async () => {
      await careerKnowledgeSyncService.importProfileData(PROFILE_ID, cloudPayload);

      const localProfile = await db.careerProfiles.get(PROFILE_ID);
      const localFacts = await db.careerFacts.toArray();
      const localEv = await db.careerEvidence.toArray();
      const localLinks = await db.factEvidenceLinks.toArray();
      const localNotes = await db.careerNotes.toArray();

      expect(localProfile?.id).toBe(PROFILE_ID);
      expect(localFacts).toHaveLength(1);
      expect(localFacts[0].verificationState).toBe('confirmed');
      expect(localEv).toHaveLength(1);
      expect(localLinks).toHaveLength(1);
      expect(localNotes).toHaveLength(1);
    });

    it('upgrades local needs_confirmation fact to confirmed if remote is confirmed', async () => {
      // Local fact is unconfirmed
      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });
      await careerKnowledgeRepository.createFact(
        {
          profileId: PROFILE_ID,
          category: 'skill',
          subject: 'TypeScript',
          claim: 'TypeScript Expert',
          origin: 'user',
          verificationState: 'needs_confirmation',
        },
        { id: () => 'fact-1', now: () => '2026-10-01T09:00:00.000Z' }
      );

      // Remote fact is confirmed
      await careerKnowledgeSyncService.importProfileData(PROFILE_ID, cloudPayload);

      const updatedFact = await db.careerFacts.get('fact-1');
      expect(updatedFact?.verificationState).toBe('confirmed');
    });

    it('never silently downgrades local confirmed fact if remote is needs_confirmation', async () => {
      // Local fact is confirmed
      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });
      const fact = await careerKnowledgeRepository.createFact(
        {
          profileId: PROFILE_ID,
          category: 'skill',
          subject: 'TypeScript',
          claim: 'TypeScript Expert',
          origin: 'user',
          verificationState: 'needs_confirmation',
        },
        { id: () => 'fact-1', now: () => '2026-10-01T09:00:00.000Z' }
      );

      await careerKnowledgeRepository.confirmFact(fact.id, 'user');

      // Remote payload with unconfirmed fact
      const unconfirmedPayload: CareerKnowledgeSyncData = {
        ...cloudPayload,
        facts: [
          {
            ...cloudPayload.facts[0],
            verificationState: 'needs_confirmation',
          },
        ],
      };

      await careerKnowledgeSyncService.importProfileData(PROFILE_ID, unconfirmedPayload);

      const preservedFact = await db.careerFacts.get('fact-1');
      expect(preservedFact?.verificationState).toBe('confirmed');
    });

    it('preserves supersession and links idempotently', async () => {
      const fact2: CareerFact = {
        id: 'fact-2',
        profileId: PROFILE_ID,
        category: 'skill',
        subject: 'TypeScript Architect',
        claim: 'Principal TS Architect',
        verificationState: 'needs_confirmation',
        origin: 'user',
        createdAt: '2026-10-01T11:00:00.000Z',
        updatedAt: '2026-10-01T11:00:00.000Z',
      };

      const payloadWithSupersession: CareerKnowledgeSyncData = {
        ...cloudPayload,
        facts: [{ ...cloudPayload.facts[0], supersededBy: 'fact-2' }, fact2],
      };

      await careerKnowledgeSyncService.importProfileData(PROFILE_ID, payloadWithSupersession);

      const f1 = await db.careerFacts.get('fact-1');
      const f2 = await db.careerFacts.get('fact-2');
      expect(f1?.supersededBy).toBe('fact-2');
      expect(f2?.id).toBe('fact-2');

      // Re-importing same data is idempotent
      await careerKnowledgeSyncService.importProfileData(PROFILE_ID, payloadWithSupersession);
      expect(await db.careerFacts.count()).toBe(2);
      expect(await db.factEvidenceLinks.count()).toBe(1);
    });
  });

  describe('pushProfile', () => {
    it('exports local data and posts to /sync endpoint', async () => {
      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { success: true, profileId: PROFILE_ID, syncedAt: '2026-10-01T12:00:00.000Z' },
      });

      const res = await careerKnowledgeSyncService.pushProfile(SYNC_ID, PASSWORD, PROFILE_ID);

      expect(res.success).toBe(true);
      expect(res.profileId).toBe(PROFILE_ID);
      expect(res.syncedAt).toBe('2026-10-01T12:00:00.000Z');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/sync',
        expect.objectContaining({
          action: 'push_career_knowledge',
          password: PASSWORD,
          profileId: PROFILE_ID,
        }),
        { headers: expect.objectContaining({ 'x-sync-id': SYNC_ID }) }
      );
    });

    it('returns error when local profile does not exist', async () => {
      const res = await careerKnowledgeSyncService.pushProfile(
        SYNC_ID,
        PASSWORD,
        'missing-profile'
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('not found');
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('pullProfile', () => {
    it('fetches remote data and merges into local Dexie', async () => {
      const mockRemoteData: CareerKnowledgeSyncData = {
        profile: {
          id: PROFILE_ID,
          schemaVersion: 1,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
        facts: [
          {
            id: 'fact-1',
            profileId: PROFILE_ID,
            category: 'experience',
            subject: 'Acme',
            claim: 'Lead Engineer',
            verificationState: 'confirmed',
            origin: 'user',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        evidence: [],
        links: [],
        notes: [],
      };

      // apiClient's response interceptor returns response.data directly,
      // so the mock resolves to the body (not an axios {data} envelope).
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        profileId: PROFILE_ID,
        data: mockRemoteData,
      } as unknown as never);

      const res = await careerKnowledgeSyncService.pullProfile(SYNC_ID, PASSWORD, PROFILE_ID);

      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockRemoteData);

      const localProfile = await db.careerProfiles.get(PROFILE_ID);
      const localFact = await db.careerFacts.get('fact-1');
      expect(localProfile?.id).toBe(PROFILE_ID);
      expect(localFact?.subject).toBe('Acme');
    });
  });

  describe('syncProfile (bidirectional)', () => {
    it('pulls remote state first, merges locally, and pushes consolidated state back', async () => {
      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const remoteData: CareerKnowledgeSyncData = {
        profile: {
          id: PROFILE_ID,
          schemaVersion: 1,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
        facts: [],
        evidence: [],
        links: [],
        notes: [],
      };

      // 1st call: pullProfile (body shape — interceptor already unwrapped)
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        profileId: PROFILE_ID,
        data: remoteData,
      } as unknown as never);
      // 2nd call: pushProfile
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        profileId: PROFILE_ID,
        syncedAt: '2026-10-01T12:00:00.000Z',
      } as unknown as never);

      const res = await careerKnowledgeSyncService.syncProfile(SYNC_ID, PASSWORD, PROFILE_ID);

      expect(res.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledTimes(2);
    });

    it('treats a 404 pull as absent remote and proceeds to push', async () => {
      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const notFoundErr = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Profile not found on cloud.' },
        },
      };

      // 1st call: pullProfile -> 404 (absent); 2nd call: pushProfile -> success
      vi.mocked(apiClient.post).mockRejectedValueOnce(notFoundErr);
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        profileId: PROFILE_ID,
        syncedAt: '2026-10-01T12:00:00.000Z',
      } as unknown as never);

      const res = await careerKnowledgeSyncService.syncProfile(SYNC_ID, PASSWORD, PROFILE_ID);

      expect(res.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledTimes(2);
    });

    it('aborts sync when pull fails with a non-404 error mentioning "not found"', async () => {
      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      // A 400 whose message happens to contain "not found" must NOT be
      // treated as an absent remote profile.
      const badRequestErr = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: 'Link references foreign or non-existent factId "x" (not found in scope)',
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValueOnce(badRequestErr);

      const res = await careerKnowledgeSyncService.syncProfile(SYNC_ID, PASSWORD, PROFILE_ID);

      expect(res.success).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('listRemoteProfiles & deleteRemoteProfile', () => {
    it('lists remote profile summaries', async () => {
      const summaries = [
        {
          id: PROFILE_ID,
          schemaVersion: 1,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
      ];
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        profiles: summaries,
      } as unknown as never);

      const res = await careerKnowledgeSyncService.listRemoteProfiles(SYNC_ID, PASSWORD);
      expect(res.success).toBe(true);
      expect(res.profiles).toEqual(summaries);
    });

    it('deletes remote profile', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
      } as unknown as never);

      const res = await careerKnowledgeSyncService.deleteRemoteProfile(
        SYNC_ID,
        PASSWORD,
        PROFILE_ID
      );
      expect(res.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/sync',
        { action: 'delete_career_profile', password: PASSWORD, profileId: PROFILE_ID },
        { headers: expect.objectContaining({ 'x-sync-id': SYNC_ID }) }
      );
    });
  });

  describe('Production Hardening, Retry & Telemetry (Phase 8)', () => {
    it('rejects unsupported future schema versions during pull without corrupting Dexie', async () => {
      const futureData: CareerKnowledgeSyncData = {
        profile: {
          id: PROFILE_ID,
          schemaVersion: 99, // Future unsupported version
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T10:00:00.000Z',
        },
        facts: [],
        evidence: [],
        links: [],
        notes: [],
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        profileId: PROFILE_ID,
        data: futureData,
      } as unknown as never);

      const res = await careerKnowledgeSyncService.pullProfile(SYNC_ID, PASSWORD, PROFILE_ID, {
        maxRetries: 0,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('schema_mismatch');
      expect(res.errorCategory).toBe('schema_mismatch');
      expect(res.error).toContain('Unsupported schema version 99');

      // Assert local Dexie remained clean
      const local = await db.careerProfiles.get(PROFILE_ID);
      expect(local).toBeUndefined();
    });

    it('classifies 401 as auth_failure and does not retry', async () => {
      const authErr = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Invalid password' },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValueOnce(authErr);

      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const res = await careerKnowledgeSyncService.pushProfile(SYNC_ID, PASSWORD, PROFILE_ID, {
        maxRetries: 2,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('auth_failure');
      expect(res.errorCategory).toBe('auth_failure');
      expect(apiClient.post).toHaveBeenCalledTimes(1); // No retries for 401
    });

    it('classifies 403 as authorization_failure and does not retry', async () => {
      const authzErr = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { error: 'Forbidden: Profile belongs to another account' },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValueOnce(authzErr);

      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const res = await careerKnowledgeSyncService.pushProfile(SYNC_ID, PASSWORD, PROFILE_ID, {
        maxRetries: 2,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('authorization_failure');
      expect(res.errorCategory).toBe('authorization_failure');
      expect(apiClient.post).toHaveBeenCalledTimes(1); // No retries for 403
    });

    it('classifies 409 as conflict and does not retry', async () => {
      const conflictErr = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: 'Immutable evidence cannot be modified',
            code: 'EVIDENCE_IMMUTABILITY_VIOLATION',
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValueOnce(conflictErr);

      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const res = await careerKnowledgeSyncService.pushProfile(SYNC_ID, PASSWORD, PROFILE_ID, {
        maxRetries: 2,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('conflict');
      expect(res.errorCategory).toBe('conflict');
      expect(apiClient.post).toHaveBeenCalledTimes(1); // No retries for 409
    });

    it('retries transient 5xx server errors up to maxRetries', async () => {
      const serverErr = {
        isAxiosError: true,
        response: {
          status: 503,
          data: { error: 'Database unavailable' },
        },
      };

      vi.mocked(apiClient.post)
        .mockRejectedValueOnce(serverErr)
        .mockRejectedValueOnce(serverErr)
        .mockResolvedValueOnce({
          success: true,
          profileId: PROFILE_ID,
          syncedAt: '2026-10-01T12:00:00.000Z',
        } as unknown as never);

      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const res = await careerKnowledgeSyncService.pushProfile(SYNC_ID, PASSWORD, PROFILE_ID, {
        maxRetries: 2,
        initialDelayMs: 5,
        maxDelayMs: 20,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('success');
      expect(res.retryCount).toBe(2);
      expect(apiClient.post).toHaveBeenCalledTimes(3);
    });

    it('classifies network timeout as unknown_outcome when retries are exhausted', async () => {
      const timeoutErr = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      vi.mocked(apiClient.post).mockRejectedValue(timeoutErr);

      await careerKnowledgeRepository.createProfile({ id: () => PROFILE_ID });

      const res = await careerKnowledgeSyncService.pushProfile(SYNC_ID, PASSWORD, PROFILE_ID, {
        maxRetries: 1,
        initialDelayMs: 5,
        maxDelayMs: 10,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('unknown_outcome');
      expect(res.errorCategory).toBe('timeout');
    });

    it('performs health diagnostic check against /sync?health=1', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        status: 'healthy',
        database: 'connected',
        schemaVersion: 1,
      });

      const health = await careerKnowledgeSyncService.checkHealth();
      expect(health.healthy).toBe(true);
      expect(health.status).toBe('healthy');
      expect(health.database).toBe('connected');
      expect(health.schemaVersion).toBe(1);
    });
  });
});
