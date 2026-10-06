// Career Knowledge External Evidence Acquisition & Provenance Tests (Phase 5).
//
// Uses fake-indexeddb for Dexie persistence testing.
// Mocks the underlying GitHub API wrapper fetchGitHubRepos to test without live calls.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { CareerKnowledgeRepository } from './repository';
import { ExternalEvidenceService, GitHubEvidenceProvider } from './externalEvidence';
import type { CareerProfile, EvidenceQuery } from '@/types/careerKnowledge';
import { fetchGitHubRepos, type GitHubRepo } from '@/lib/github';

// Mock fetchGitHubRepos
vi.mock('@/lib/github', () => ({
  fetchGitHubRepos: vi.fn(),
}));

describe('Career Knowledge External Evidence Acquisition & Provenance', () => {
  let repo: CareerKnowledgeRepository;
  let service: ExternalEvidenceService;
  let profileA: CareerProfile;
  let profileB: CareerProfile;

  beforeEach(async () => {
    repo = new CareerKnowledgeRepository();
    // Register the GitHub provider
    service = new ExternalEvidenceService(repo, [new GitHubEvidenceProvider()]);

    // Create clean profiles
    profileA = await repo.saveProfile({
      id: 'profile-a',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    });
    profileB = await repo.saveProfile({
      id: 'profile-b',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await db.transaction(
      'rw',
      [db.careerFacts, db.careerEvidence, db.factEvidenceLinks, db.careerProfiles],
      async () => {
        await db.careerFacts.clear();
        await db.careerEvidence.clear();
        await db.factEvidenceLinks.clear();
        await db.careerProfiles.clear();
      }
    );
  });

  describe('Provider Contract', () => {
    it('successfully processes observed repositories', async () => {
      const mockRepos = [
        {
          id: 12345,
          name: 'super-app',
          full_name: 'test-user/super-app',
          html_url: 'https://github.com/test-user/super-app',
          description: 'A great application',
          language: 'Go',
          stargazers_count: 42,
          updated_at: '2026-10-01T12:00:00Z',
          fork: false,
          topics: ['golang', 'api'],
        },
      ];
      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce(mockRepos as unknown as GitHubRepo[]);

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      const result = await service.acquireEvidence('github', query, { createCandidates: true });

      expect(result.status).toBe('success');
      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0].sourceType).toBe('github');
      expect(result.evidence[0].sourceRef).toBe('12345');
      expect(result.evidence[0].url).toBe('https://github.com/test-user/super-app');
      expect(result.evidence[0].excerpt).toBe('A great application');

      expect(result.candidateFacts).toHaveLength(1);
      expect(result.candidateFacts[0].subject).toBe('super-app');
      expect(result.candidateFacts[0].category).toBe('project');
      expect(result.candidateFacts[0].origin).toBe('external');
      expect(result.candidateFacts[0].verificationState).toBe('observed'); // Candidate state

      expect(result.links).toHaveLength(1);
      expect(result.links[0].relation).toBe('supports');
    });

    it('returns empty results when no repositories are found', async () => {
      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce([]);

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      const result = await service.acquireEvidence('github', query);
      expect(result.status).toBe('no_results');
      expect(result.evidence).toHaveLength(0);
      expect(result.candidateFacts).toHaveLength(0);
    });

    it('distinguishes rate limiting from no evidence', async () => {
      vi.mocked(fetchGitHubRepos).mockRejectedValueOnce(new Error('Rate limit exceeded (403)'));

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      const result = await service.acquireEvidence('github', query);
      expect(result.status).toBe('rate_limited');
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.evidence).toHaveLength(0);
    });

    it('distinguishes invalid authentication', async () => {
      vi.mocked(fetchGitHubRepos).mockRejectedValueOnce(new Error('Invalid token (401)'));

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      const result = await service.acquireEvidence('github', query);
      expect(result.status).toBe('auth_error');
      expect(result.error).toContain('Invalid token');
      expect(result.evidence).toHaveLength(0);
    });
  });

  describe('Idempotency', () => {
    it('does not duplicate CareerEvidence on repeated acquisition of same resource', async () => {
      const mockRepos = [
        {
          id: 555,
          name: 'lib-foo',
          full_name: 'test-user/lib-foo',
          html_url: 'https://github.com/test-user/lib-foo',
          description: 'Utility library',
          language: 'TypeScript',
          stargazers_count: 5,
          updated_at: '2026-10-01T12:00:00Z',
          fork: false,
        },
      ];

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      // First run: Creates evidence and candidate fact
      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce(mockRepos as unknown as GitHubRepo[]);
      const res1 = await service.acquireEvidence('github', query, { createCandidates: true });
      expect(res1.evidence).toHaveLength(1);
      expect(res1.candidateFacts).toHaveLength(1);

      // Second run: Reuses existing evidence and matches the fact deterministically
      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce(mockRepos as unknown as GitHubRepo[]);
      const res2 = await service.acquireEvidence('github', query, { createCandidates: true });

      // No new entities should be created inside the second transaction because they already exist!
      expect(res2.evidence).toHaveLength(0);
      expect(res2.candidateFacts).toHaveLength(0);
      expect(res2.links).toHaveLength(0);

      const dbEvidence = await repo.listEvidence(profileA.id);
      expect(dbEvidence).toHaveLength(1);

      const dbFacts = await repo.listFacts(profileA.id);
      expect(dbFacts).toHaveLength(1);
    });
  });

  describe('Candidate Safety', () => {
    it('creates facts with observed state and external origin, NEVER confirmed', async () => {
      const mockRepos = [
        {
          id: 999,
          name: 'some-tool',
          full_name: 'test-user/some-tool',
          html_url: 'https://github.com/test-user/some-tool',
          description: 'A tool',
          language: 'Rust',
          stargazers_count: 10,
          updated_at: '2026-10-01T12:00:00Z',
          fork: false,
        },
      ];
      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce(mockRepos as unknown as GitHubRepo[]);

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      const result = await service.acquireEvidence('github', query, { createCandidates: true });
      expect(result.candidateFacts[0].verificationState).toBe('observed');
      expect(result.candidateFacts[0].origin).toBe('external');
      expect(result.candidateFacts[0].verificationState).not.toBe('confirmed');
    });
  });

  describe('Deterministic Fact Attachment', () => {
    it('attaches new evidence to existing facts deterministically without altering verificationState', async () => {
      // Pre-populate an existing confirmed fact
      const initialFact = await repo.createFact({
        profileId: profileA.id,
        category: 'project',
        subject: 'existing-repo',
        claim: 'Did custom work in existing-repo.',
        structured: { repository: 'test-user/existing-repo' },
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      const existingFact = await repo.confirmFact(initialFact.id, 'user');

      const mockRepos = [
        {
          id: 8888,
          name: 'existing-repo',
          full_name: 'test-user/existing-repo',
          html_url: 'https://github.com/test-user/existing-repo',
          description: 'A pre-existing repo',
          language: 'Go',
          stargazers_count: 100,
          updated_at: '2026-10-01T12:00:00Z',
          fork: false,
        },
      ];
      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce(mockRepos as unknown as GitHubRepo[]);

      const query: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      // Acquisition run
      const result = await service.acquireEvidence('github', query, { createCandidates: true });

      // Should find the existing fact and attach evidence, NOT create a new candidate fact!
      expect(result.evidence).toHaveLength(1);
      expect(result.candidateFacts).toHaveLength(0);
      expect(result.links).toHaveLength(1);
      expect(result.links[0].factId).toBe(existingFact.id);

      // Invariant: Existing verified state remains confirmed
      const dbFact = await repo.getFact(existingFact.id);
      expect(dbFact?.verificationState).toBe('confirmed');
    });
  });

  describe('Profile Isolation', () => {
    it('guarantees acquired evidence and candidate facts are strictly bounded to target profileId', async () => {
      const mockRepos = [
        {
          id: 1111,
          name: 'secret-lib',
          full_name: 'test-user/secret-lib',
          html_url: 'https://github.com/test-user/secret-lib',
          description: 'Secret repo',
          language: 'C++',
          stargazers_count: 0,
          updated_at: '2026-10-01T12:00:00Z',
          fork: false,
        },
      ];

      const queryA: EvidenceQuery = {
        profileId: profileA.id,
        subject: 'test-user',
        query: 'test-user',
      };

      vi.mocked(fetchGitHubRepos).mockResolvedValueOnce(mockRepos as unknown as GitHubRepo[]);
      const resA = await service.acquireEvidence('github', queryA, { createCandidates: true });

      expect(resA.evidence[0].profileId).toBe(profileA.id);
      expect(resA.candidateFacts[0].profileId).toBe(profileA.id);

      // Verify B's databases are completely isolated and empty
      const evidenceB = await repo.listEvidence(profileB.id);
      expect(evidenceB).toHaveLength(0);

      const factsB = await repo.listFacts(profileB.id);
      expect(factsB).toHaveLength(0);
    });
  });
});
