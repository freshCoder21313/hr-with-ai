// Career Knowledge Data Lifecycle, Recovery & Migration Hardening Tests (Phase 14).
//
// Tests complete export/import, referential validation, verification invariants,
// supersession preservation, Resume attribution recovery, cloud recovery,
// corruption detection, orphan handling, profile deletion, and migration safety.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import {
  validateCareerKnowledgeIntegrity,
  detectCareerKnowledgeOrphans,
  repairCareerKnowledgeOrphans,
  exportCareerKnowledgeDataset,
  importCareerKnowledgeDataset,
  CURRENT_CK_EXPORT_VERSION,
} from './dataLifecycle';
import { CareerKnowledgeRepository } from './repository';
import { CareerKnowledgeSyncService } from './syncService';
import {
  VALID_V1_FIXTURE,
  MIGRATION_PROFILE_ID,
  FOREIGN_PROFILE_ID,
  CORRUPT_MISSING_PROFILE_FIXTURE,
  CORRUPT_DANGLING_LINK_FIXTURE,
  CORRUPT_CROSS_PROFILE_FIXTURE,
  CORRUPT_SUPERSESSION_CYCLE_FIXTURE,
  FUTURE_SCHEMA_FIXTURE,
  LEGACY_V0_FACTS,
  migrateLegacyToV1,
} from './fixtures/migrationFixtures';
import type {
  CareerEvidence,
  CareerFact,
  CareerNote,
  CareerProfile,
  FactEvidenceLink,
} from '@/types/careerKnowledge';
import type { Resume } from '@/types/resume';

class TestHRDatabase extends Dexie {
  careerProfiles!: Dexie.Table<CareerProfile, string>;
  careerFacts!: Dexie.Table<CareerFact, string>;
  careerEvidence!: Dexie.Table<CareerEvidence, string>;
  factEvidenceLinks!: Dexie.Table<FactEvidenceLink, [string, string]>;
  careerNotes!: Dexie.Table<CareerNote, string>;
  resumes!: Dexie.Table<Resume, number>;

  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      careerProfiles: 'id, createdAt, updatedAt',
      careerFacts: 'id, profileId, category, verificationState, supersededBy, createdAt, updatedAt',
      careerEvidence: 'id, profileId, sourceType, capturedAt',
      factEvidenceLinks: '[factId+evidenceId], factId, evidenceId',
      careerNotes: 'id, factId, createdAt, updatedAt',
      resumes: '++id, createdAt, fileName',
    });
  }
}

describe('Career Knowledge Phase 14: Data Lifecycle, Recovery & Migration Hardening', () => {
  let testDb: TestHRDatabase;
  let repo: CareerKnowledgeRepository;

  beforeEach(async () => {
    const dbName = `test-data-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    testDb = new TestHRDatabase(dbName);
    repo = new CareerKnowledgeRepository(testDb as any);
  });

  // ---------------------------------------------------------------------------
  // 1. Export Invariants & Preservation
  // ---------------------------------------------------------------------------
  describe('1. Export & Export Invariants', () => {
    it('exports all 5 normalized Career Knowledge entities completely', async () => {
      // Seed valid fixture
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(VALID_V1_FIXTURE.facts);
      await testDb.careerEvidence.bulkAdd(VALID_V1_FIXTURE.evidence);
      for (const link of VALID_V1_FIXTURE.links) {
        await testDb.factEvidenceLinks.put(link);
      }
      await testDb.careerNotes.bulkAdd(VALID_V1_FIXTURE.notes);

      const exported = await exportCareerKnowledgeDataset(MIGRATION_PROFILE_ID, testDb as any);

      expect(exported.formatVersion).toBe(CURRENT_CK_EXPORT_VERSION);
      expect(exported.profileId).toBe(MIGRATION_PROFILE_ID);
      expect(exported.profiles).toHaveLength(1);
      expect(exported.facts).toHaveLength(VALID_V1_FIXTURE.facts.length);
      expect(exported.evidence).toHaveLength(VALID_V1_FIXTURE.evidence.length);
      expect(exported.links).toHaveLength(VALID_V1_FIXTURE.links.length);
      expect(exported.notes).toHaveLength(VALID_V1_FIXTURE.notes.length);
    });

    it('preserves stable IDs, verification states, provenance, and supersession', async () => {
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(VALID_V1_FIXTURE.facts);
      await testDb.careerEvidence.bulkAdd(VALID_V1_FIXTURE.evidence);
      for (const link of VALID_V1_FIXTURE.links) {
        await testDb.factEvidenceLinks.put(link);
      }

      const exported = await exportCareerKnowledgeDataset(MIGRATION_PROFILE_ID, testDb as any);

      // Verify specific fact fields
      const fact2 = exported.facts.find((f) => f.id === 'fact-mig-2');
      expect(fact2).toBeDefined();
      expect(fact2?.verificationState).toBe('needs_confirmation');
      expect(fact2?.supersededBy).toBe('fact-mig-3');
      expect(fact2?.origin).toBe('migration');

      const fact3 = exported.facts.find((f) => f.id === 'fact-mig-3');
      expect(fact3).toBeDefined();
      expect(fact3?.verificationState).toBe('confirmed');
      expect(fact3?.origin).toBe('user');

      // Verify evidence provenance
      const ev1 = exported.evidence.find((e) => e.id === 'ev-mig-1');
      expect(ev1?.sourceType).toBe('github');
      expect(ev1?.sourceRef).toBe('repo/cli-tool');
      expect(ev1?.capturedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('contains no secrets or credentials in export', async () => {
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(VALID_V1_FIXTURE.facts);

      const exported = await exportCareerKnowledgeDataset(MIGRATION_PROFILE_ID, testDb as any);
      const serialized = JSON.stringify(exported);

      expect(serialized).not.toContain('apiKey');
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('bearerToken');
      expect(serialized).not.toContain('githubToken');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Import Validation & Trust Boundary
  // ---------------------------------------------------------------------------
  describe('2. Import Validation & Trust Boundary', () => {
    it('validates schema and successfully imports valid dataset', async () => {
      const result = await importCareerKnowledgeDataset(VALID_V1_FIXTURE, {}, testDb as any);

      expect(result.importedCounts.profiles).toBe(1);
      expect(result.importedCounts.facts).toBe(VALID_V1_FIXTURE.facts.length);
      expect(result.importedCounts.evidence).toBe(VALID_V1_FIXTURE.evidence.length);

      const profileInDb = await testDb.careerProfiles.get(MIGRATION_PROFILE_ID);
      expect(profileInDb).toBeDefined();
      expect(profileInDb?.id).toBe(MIGRATION_PROFILE_ID);
    });

    it('rejects malformed payload non-object', async () => {
      await expect(
        importCareerKnowledgeDataset('invalid-json', {}, testDb as any)
      ).rejects.toThrow();
      await expect(importCareerKnowledgeDataset(null, {}, testDb as any)).rejects.toThrow();
    });

    it('rejects payload with unsupported future export format version', async () => {
      const futurePayload = {
        formatVersion: 999,
        exportedAt: '2030-01-01T00:00:00.000Z',
        profiles: [VALID_V1_FIXTURE.profile],
        facts: [],
        evidence: [],
        links: [],
        notes: [],
      };

      await expect(importCareerKnowledgeDataset(futurePayload, {}, testDb as any)).rejects.toThrow(
        /Unsupported Career Knowledge export format version/
      );
    });

    it('rejects cross-profile import when foreign profile does not match target profile', async () => {
      await expect(
        importCareerKnowledgeDataset(
          VALID_V1_FIXTURE,
          { targetProfileId: FOREIGN_PROFILE_ID, allowCrossProfileMapping: false },
          testDb as any
        )
      ).rejects.toThrow(/Cross-profile import rejected/);
    });

    it('rejects import with referential violation (missing parent profile)', async () => {
      await expect(
        importCareerKnowledgeDataset(CORRUPT_MISSING_PROFILE_FIXTURE, {}, testDb as any)
      ).rejects.toThrow();
    });

    it('rejects import with referential violation (missing evidence in link)', async () => {
      await expect(
        importCareerKnowledgeDataset(CORRUPT_DANGLING_LINK_FIXTURE, {}, testDb as any)
      ).rejects.toThrow(/Referential integrity violation/);
    });

    it('rejects import with self-referential supersession', async () => {
      const selfSuperseded = {
        ...VALID_V1_FIXTURE,
        facts: [
          {
            ...VALID_V1_FIXTURE.facts[0],
            supersededBy: VALID_V1_FIXTURE.facts[0].id,
          },
        ],
      };

      await expect(importCareerKnowledgeDataset(selfSuperseded, {}, testDb as any)).rejects.toThrow(
        /cannot supersede itself/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Verification Invariant & Idempotency Preservation
  // ---------------------------------------------------------------------------
  describe('3. Verification Invariant & Idempotency', () => {
    it('is strictly idempotent on repeated imports', async () => {
      await importCareerKnowledgeDataset(VALID_V1_FIXTURE, {}, testDb as any);
      const factsFirst = await testDb.careerFacts.toArray();

      // Second import of identical payload
      await importCareerKnowledgeDataset(VALID_V1_FIXTURE, {}, testDb as any);
      const factsSecond = await testDb.careerFacts.toArray();

      expect(factsSecond).toHaveLength(factsFirst.length);
      expect(factsSecond).toEqual(factsFirst);
    });

    it('never downgrades an existing confirmed fact when imported dataset has needs_confirmation', async () => {
      // 1. User confirms a local fact
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      const localConfirmedFact: CareerFact = {
        id: 'fact-mig-1',
        profileId: MIGRATION_PROFILE_ID,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'Proficient in TypeScript 5',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      await testDb.careerFacts.add(localConfirmedFact);

      // 2. Incoming import attempts to set needs_confirmation
      const unconfirmedPayload = {
        profile: VALID_V1_FIXTURE.profile,
        facts: [
          {
            ...localConfirmedFact,
            verificationState: 'needs_confirmation' as const,
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        evidence: [],
        links: [],
        notes: [],
      };

      await importCareerKnowledgeDataset(unconfirmedPayload, {}, testDb as any);

      const finalFact = await testDb.careerFacts.get('fact-mig-1');
      expect(finalFact?.verificationState).toBe('confirmed');
    });

    it('upgrades local needs_confirmation fact to confirmed if imported fact is confirmed', async () => {
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      const localUnconfirmedFact: CareerFact = {
        id: 'fact-mig-1',
        profileId: MIGRATION_PROFILE_ID,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'TypeScript developer',
        verificationState: 'needs_confirmation',
        origin: 'migration',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      await testDb.careerFacts.add(localUnconfirmedFact);

      const confirmedPayload = {
        profile: VALID_V1_FIXTURE.profile,
        facts: [
          {
            ...localUnconfirmedFact,
            verificationState: 'confirmed' as const,
            origin: 'user' as const,
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        evidence: [],
        links: [],
        notes: [],
      };

      await importCareerKnowledgeDataset(confirmedPayload, {}, testDb as any);

      const finalFact = await testDb.careerFacts.get('fact-mig-1');
      expect(finalFact?.verificationState).toBe('confirmed');
    });

    it('enforces evidence immutability during import', async () => {
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerEvidence.add(VALID_V1_FIXTURE.evidence[0]);

      // Attempt to overwrite evidence with divergent content
      const divergentPayload = {
        profile: VALID_V1_FIXTURE.profile,
        facts: [],
        evidence: [
          {
            ...VALID_V1_FIXTURE.evidence[0],
            excerpt: 'Completely different fabricated claim',
          },
        ],
        links: [],
        notes: [],
      };

      await importCareerKnowledgeDataset(divergentPayload, {}, testDb as any);

      // Local immutable evidence is preserved
      const ev = await testDb.careerEvidence.get(VALID_V1_FIXTURE.evidence[0].id);
      expect(ev?.excerpt).toBe(VALID_V1_FIXTURE.evidence[0].excerpt);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Complete Round-Trip & Local DB Reset
  // ---------------------------------------------------------------------------
  describe('4. Complete Round-Trip & Local DB Reset', () => {
    it('recovers complete semantic state after local DB reset', async () => {
      // 1. Populate full dataset
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(VALID_V1_FIXTURE.facts);
      await testDb.careerEvidence.bulkAdd(VALID_V1_FIXTURE.evidence);
      for (const link of VALID_V1_FIXTURE.links) {
        await testDb.factEvidenceLinks.put(link);
      }
      await testDb.careerNotes.bulkAdd(VALID_V1_FIXTURE.notes);

      // 2. Export dataset
      const exported = await exportCareerKnowledgeDataset(MIGRATION_PROFILE_ID, testDb as any);

      // 3. Simulate local DB loss / clear
      await testDb.careerProfiles.clear();
      await testDb.careerFacts.clear();
      await testDb.careerEvidence.clear();
      await testDb.factEvidenceLinks.clear();
      await testDb.careerNotes.clear();

      expect(await testDb.careerFacts.count()).toBe(0);

      // 4. Restore from export
      await importCareerKnowledgeDataset(exported, {}, testDb as any);

      // 5. Verify integrity and equivalence
      const report = await validateCareerKnowledgeIntegrity(
        { profileId: MIGRATION_PROFILE_ID, checkResumes: false },
        testDb as any
      );
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);

      const recoveredFacts = await testDb.careerFacts.toArray();
      expect(recoveredFacts).toHaveLength(VALID_V1_FIXTURE.facts.length);

      // Check supersession survived
      const superseded = recoveredFacts.find((f) => f.id === 'fact-mig-2');
      expect(superseded?.supersededBy).toBe('fact-mig-3');

      // Check all 4 verification states survived
      const states = new Set(recoveredFacts.map((f) => f.verificationState));
      expect(states.has('confirmed')).toBe(true);
      expect(states.has('needs_confirmation')).toBe(true);
      expect(states.has('observed')).toBe(true);
      expect(states.has('rejected')).toBe(true);
    });

    it('preserves Resume attribution (derivedFromFactIds) through recovery', async () => {
      // 1. Seed Career Knowledge
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(VALID_V1_FIXTURE.facts);

      // 2. Create a Resume with derivedFromFactIds pointing to fact-mig-1 and fact-mig-3
      const sampleResume: Resume = {
        id: 101,
        fileName: 'tailored_resume.pdf',
        rawText: 'Jane Doe Senior Backend Engineer TechCorp',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parsedData: {
          basics: {
            name: 'Jane Doe',
            derivedFromFactIds: ['fact-mig-1'],
          },
          work: [
            {
              name: 'TechCorp',
              position: 'Senior Backend Engineer',
              derivedFromFactIds: ['fact-mig-3'],
            },
          ],
          education: [],
          skills: [],
          projects: [],
        },
      };
      await testDb.resumes.add(sampleResume);

      // 3. Export CK dataset
      const exported = await exportCareerKnowledgeDataset(MIGRATION_PROFILE_ID, testDb as any);

      // 4. Simulate CK reset
      await testDb.careerFacts.clear();
      await testDb.careerProfiles.clear();

      // Integrity check should warn about broken resume attribution during the gap
      const brokenReport = await validateCareerKnowledgeIntegrity(
        { checkResumes: true },
        testDb as any
      );
      expect(brokenReport.warnings.some((w) => w.kind === 'broken_resume_attribution')).toBe(true);

      // 5. Restore CK
      await importCareerKnowledgeDataset(exported, {}, testDb as any);

      // 6. Integrity check after restore should have 0 broken attribution warnings
      const restoredReport = await validateCareerKnowledgeIntegrity(
        { checkResumes: true },
        testDb as any
      );
      const brokenAttributions = restoredReport.warnings.filter(
        (w) => w.kind === 'broken_resume_attribution'
      );
      expect(brokenAttributions).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Semantic Integrity Validator & Partial Corruption
  // ---------------------------------------------------------------------------
  describe('5. Semantic Integrity Validator & Partial Corruption', () => {
    it('detects missing profile, invalid category, and malformed verification state', async () => {
      // Corrupt facts directly in DB
      await (testDb.careerFacts as any).add({
        id: 'corrupt-1',
        profileId: 'non-existent-profile',
        category: 'invalid_category_xyz',
        subject: 'Sub',
        claim: 'Claim',
        verificationState: 'invalid_state_123',
        origin: 'user',
        createdAt: 'not-a-date',
        updatedAt: 'not-a-date',
      });

      const report = await validateCareerKnowledgeIntegrity({}, testDb as any);

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.kind === 'missing_profile')).toBe(true);
      expect(report.errors.some((e) => e.kind === 'invalid_category')).toBe(true);
      expect(report.errors.some((e) => e.kind === 'invalid_verification_state')).toBe(true);
    });

    it('detects supersession cycles', async () => {
      await testDb.careerProfiles.add(CORRUPT_SUPERSESSION_CYCLE_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(CORRUPT_SUPERSESSION_CYCLE_FIXTURE.facts);

      const report = await validateCareerKnowledgeIntegrity(
        { profileId: MIGRATION_PROFILE_ID },
        testDb as any
      );

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.kind === 'supersession_cycle')).toBe(true);
    });

    it('detects cross-profile evidence links', async () => {
      await testDb.careerProfiles.add(CORRUPT_CROSS_PROFILE_FIXTURE.profile);
      await testDb.careerProfiles.add({
        id: FOREIGN_PROFILE_ID,
        schemaVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      await testDb.careerFacts.bulkAdd(CORRUPT_CROSS_PROFILE_FIXTURE.facts);
      await testDb.careerEvidence.bulkAdd(CORRUPT_CROSS_PROFILE_FIXTURE.evidence);
      for (const link of CORRUPT_CROSS_PROFILE_FIXTURE.links) {
        await testDb.factEvidenceLinks.put(link);
      }

      const report = await validateCareerKnowledgeIntegrity({}, testDb as any);

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.kind === 'cross_profile_link')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Orphan Detection & Safe Pruning
  // ---------------------------------------------------------------------------
  describe('6. Orphan Detection & Safe Pruning', () => {
    it('detects dangling links and notes when parents are deleted', async () => {
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.add(VALID_V1_FIXTURE.facts[0]);
      await testDb.careerEvidence.add(VALID_V1_FIXTURE.evidence[0]);
      await testDb.factEvidenceLinks.put({
        factId: VALID_V1_FIXTURE.facts[0].id,
        evidenceId: VALID_V1_FIXTURE.evidence[0].id,
        relation: 'supports',
      });
      await testDb.careerNotes.add({
        id: 'note-orphan-test',
        factId: VALID_V1_FIXTURE.facts[0].id,
        scope: 'global',
        text: 'Sample note',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      // Directly remove fact without cascade to create orphans
      await testDb.careerFacts.delete(VALID_V1_FIXTURE.facts[0].id);

      const orphans = await detectCareerKnowledgeOrphans(MIGRATION_PROFILE_ID, testDb as any);
      expect(orphans.danglingLinks).toHaveLength(1);
      expect(orphans.danglingNotes).toContain('note-orphan-test');

      // Repair
      const repairResult = await repairCareerKnowledgeOrphans(
        { profileId: MIGRATION_PROFILE_ID },
        testDb as any
      );
      expect(repairResult.cleanedLinks).toBe(1);
      expect(repairResult.cleanedNotes).toBe(1);

      // Evidence itself was NOT deleted (independent provenance retention invariant)
      const ev = await testDb.careerEvidence.get(VALID_V1_FIXTURE.evidence[0].id);
      expect(ev).toBeDefined();
    });

    it('scoped repair never deletes another profile links or notes', async () => {
      const now = '2026-01-01T00:00:00.000Z';
      // Profile A entities
      await testDb.careerProfiles.add({
        id: MIGRATION_PROFILE_ID,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
      await testDb.careerFacts.add({
        id: 'fact-a',
        profileId: MIGRATION_PROFILE_ID,
        category: 'skill',
        subject: 'React',
        claim: 'React dev',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: now,
        updatedAt: now,
      });
      await testDb.careerEvidence.add({
        id: 'ev-a',
        profileId: MIGRATION_PROFILE_ID,
        sourceType: 'github',
        sourceRef: 'a',
        capturedAt: now,
      });
      await testDb.factEvidenceLinks.put({
        factId: 'fact-a',
        evidenceId: 'ev-a',
        relation: 'supports',
      });
      await testDb.careerNotes.add({
        id: 'note-a',
        factId: 'fact-a',
        scope: 'global',
        text: 'A',
        createdAt: now,
        updatedAt: now,
      });
      // Profile B entities
      await testDb.careerProfiles.add({
        id: FOREIGN_PROFILE_ID,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
      await testDb.careerFacts.add({
        id: 'fact-b',
        profileId: FOREIGN_PROFILE_ID,
        category: 'skill',
        subject: 'Vue',
        claim: 'Vue dev',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: now,
        updatedAt: now,
      });
      await testDb.careerEvidence.add({
        id: 'ev-b',
        profileId: FOREIGN_PROFILE_ID,
        sourceType: 'github',
        sourceRef: 'b',
        capturedAt: now,
      });
      await testDb.factEvidenceLinks.put({
        factId: 'fact-b',
        evidenceId: 'ev-b',
        relation: 'supports',
      });
      await testDb.careerNotes.add({
        id: 'note-b',
        factId: 'fact-b',
        scope: 'global',
        text: 'B',
        createdAt: now,
        updatedAt: now,
      });

      // Scoped validation for A must not flag B's rows as orphans
      const orphansA = await detectCareerKnowledgeOrphans(MIGRATION_PROFILE_ID, testDb as any);
      expect(orphansA.danglingLinks).toHaveLength(0);
      expect(orphansA.danglingNotes).toHaveLength(0);

      const repair = await repairCareerKnowledgeOrphans(
        { profileId: MIGRATION_PROFILE_ID },
        testDb as any
      );
      expect(repair.cleanedLinks).toBe(0);
      expect(repair.cleanedNotes).toBe(0);

      // B's data survives
      expect(await testDb.factEvidenceLinks.get(['fact-b', 'ev-b'])).toBeDefined();
      expect(await testDb.careerNotes.get('note-b')).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Profile Deletion Lifecycle
  // ---------------------------------------------------------------------------
  describe('7. Profile Deletion Lifecycle', () => {
    it('cascades deletion across profile, facts, evidence, links, and notes atomically', async () => {
      await testDb.careerProfiles.add(VALID_V1_FIXTURE.profile);
      await testDb.careerFacts.bulkAdd(VALID_V1_FIXTURE.facts);
      await testDb.careerEvidence.bulkAdd(VALID_V1_FIXTURE.evidence);
      for (const link of VALID_V1_FIXTURE.links) {
        await testDb.factEvidenceLinks.put(link);
      }
      await testDb.careerNotes.bulkAdd(VALID_V1_FIXTURE.notes);

      await repo.deleteProfile(MIGRATION_PROFILE_ID);

      expect(await testDb.careerProfiles.get(MIGRATION_PROFILE_ID)).toBeUndefined();
      expect(await testDb.careerFacts.where('profileId').equals(MIGRATION_PROFILE_ID).count()).toBe(
        0
      );
      expect(
        await testDb.careerEvidence.where('profileId').equals(MIGRATION_PROFILE_ID).count()
      ).toBe(0);
      expect(await testDb.factEvidenceLinks.count()).toBe(0);
      expect(await testDb.careerNotes.count()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Schema Version Migration Safety
  // ---------------------------------------------------------------------------
  describe('8. Schema Version Migration Safety', () => {
    it('migrates legacy V0 dataset to current V1 schema without data loss', async () => {
      const migrated = migrateLegacyToV1(LEGACY_V0_FACTS);

      expect(migrated).toHaveLength(1);
      expect(migrated[0].id).toBe('legacy-fact-1');
      expect(migrated[0].category).toBe('skill');
      expect(migrated[0].verificationState).toBe('needs_confirmation');
      expect(migrated[0].origin).toBe('migration');
    });

    it('rejects future unsupported schema versions explicitly', async () => {
      await testDb.careerProfiles.add(FUTURE_SCHEMA_FIXTURE.profile);

      const report = await validateCareerKnowledgeIntegrity(
        { profileId: MIGRATION_PROFILE_ID },
        testDb as any
      );

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.kind === 'schema_mismatch')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Cloud Recovery Reconstruction
  // ---------------------------------------------------------------------------
  describe('9. Cloud Recovery & Reconstruction', () => {
    it('reconstructs full local Career Knowledge from remote sync pull', async () => {
      const syncServiceInstance = new CareerKnowledgeSyncService();

      // Mock pullProfile response with VALID_V1_FIXTURE
      const mockCloudData = {
        profile: VALID_V1_FIXTURE.profile,
        facts: VALID_V1_FIXTURE.facts,
        evidence: VALID_V1_FIXTURE.evidence,
        links: VALID_V1_FIXTURE.links,
        notes: VALID_V1_FIXTURE.notes,
      };

      // Import remote data
      await syncServiceInstance.importProfileData(MIGRATION_PROFILE_ID, mockCloudData);

      const localFacts = await syncServiceInstance.exportProfileData(MIGRATION_PROFILE_ID);
      expect(localFacts).not.toBeNull();
      expect(localFacts?.facts).toHaveLength(VALID_V1_FIXTURE.facts.length);
      expect(localFacts?.evidence).toHaveLength(VALID_V1_FIXTURE.evidence.length);
      expect(localFacts?.links).toHaveLength(VALID_V1_FIXTURE.links.length);
      expect(localFacts?.notes).toHaveLength(VALID_V1_FIXTURE.notes.length);
    });
  });
});
