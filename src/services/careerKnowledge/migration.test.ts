// Resume -> Career Knowledge migration tests (Phase 3).
//
// Uses fake-indexeddb so Dexie runs against a real IndexedDB implementation
// in the jsdom test environment.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { CareerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import {
  migrateResumeToCareerKnowledge,
  previewResumeMigration,
  buildResumeFactId,
  confirmMigratedCandidate,
  rejectMigratedCandidate,
  invalidateMigratedCandidate,
} from '@/services/careerKnowledge/migration';
import type { Resume, ResumeData } from '@/types/resume';

const repo = new CareerKnowledgeRepository(db);

async function clearCareerTables() {
  await db.transaction(
    'rw',
    [db.careerProfiles, db.careerFacts, db.careerEvidence, db.factEvidenceLinks, db.careerNotes],
    async () => {
      await Promise.all([
        db.careerProfiles.clear(),
        db.careerFacts.clear(),
        db.careerEvidence.clear(),
        db.factEvidenceLinks.clear(),
        db.careerNotes.clear(),
      ]);
    }
  );
}

beforeEach(async () => {
  if (!db.isOpen()) await db.open();
  await clearCareerTables();
});

afterEach(async () => {
  await clearCareerTables();
});

function baseResume(overrides: Partial<Resume> = {}): Resume {
  const data: ResumeData = {
    basics: {
      name: 'Alice Example',
      label: 'Engineer',
      email: 'alice@example.com',
      summary: 'Experienced engineer.',
    },
    work: [
      {
        name: 'Acme Corp',
        position: 'Engineer',
        startDate: '2022-01',
        endDate: '2024-01',
        highlights: ['Built X'],
      },
    ],
    education: [
      { institution: 'Uni', studyType: 'BS', area: 'CS', startDate: '2016', endDate: '2020' },
    ],
    skills: [{ name: 'Go', keywords: ['golang', 'concurrency'] }],
    projects: [{ name: 'Payments', description: 'Payment service', keywords: ['Go', 'gRPC'] }],
    awards: [{ title: 'Best Hacker', date: '2023', awarder: 'Acme' }],
  };
  return {
    id: 1,
    createdAt: Date.now(),
    fileName: 'alice.pdf',
    rawText: '',
    parsedData: data,
    formatted: true,
    ...overrides,
  };
}

describe('previewResumeMigration', () => {
  it('returns no facts when parsedData is missing', () => {
    const result = previewResumeMigration(
      { ...baseResume(), parsedData: undefined } as Resume,
      'profile-1'
    );
    expect(result.facts).toHaveLength(0);
    expect(result.skipped.some((s) => s.path === 'parsedData')).toBe(true);
  });

  it('maps skills, work, education, projects, and awards', () => {
    const result = previewResumeMigration(baseResume(), 'profile-1');
    expect(result.facts).toHaveLength(5);

    const categories = result.facts.map((f) => f.category);
    expect(categories).toEqual(['skill', 'experience', 'education', 'project', 'achievement']);

    expect(result.facts.every((f) => f.verificationState === 'needs_confirmation')).toBe(true);
  });

  it('records deferred fields as skipped', () => {
    const result = previewResumeMigration(baseResume(), 'profile-1');
    expect(result.skipped.some((s) => s.path === 'basics.summary')).toBe(true);
  });
});

describe('migrateResumeToCareerKnowledge', () => {
  it('creates profile-scoped candidates with needs_confirmation and links evidence', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const result = await migrateResumeToCareerKnowledge(resume, profileId);

    expect(result.createdFacts).toHaveLength(5);
    expect(result.reusedFacts).toHaveLength(0);
    expect(result.createdEvidence).toHaveLength(5);
    expect(result.createdLinks).toHaveLength(5);

    const facts = await repo.listFacts(profileId);
    expect(facts).toHaveLength(5);
    expect(facts.every((f) => f.verificationState === 'needs_confirmation')).toBe(true);
    expect(facts.every((f) => f.origin === 'migration')).toBe(true);

    const evidence = await repo.listEvidence(profileId);
    expect(evidence).toHaveLength(5);
    expect(evidence.every((e) => e.sourceType === 'other')).toBe(true);

    for (const fact of facts) {
      const links = await repo.listLinksForFact(fact.id);
      expect(links).toHaveLength(1);
      expect(links[0].relation).toBe('supports');
    }
  });

  it('is idempotent: second run reuses all facts and creates no new records', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const first = await migrateResumeToCareerKnowledge(resume, profileId);
    const second = await migrateResumeToCareerKnowledge(resume, profileId);

    expect(first.createdFacts).toHaveLength(5);
    expect(second.createdFacts).toHaveLength(0);
    expect(second.reusedFacts).toHaveLength(5);
    expect(second.createdEvidence).toHaveLength(0);
    expect(second.createdLinks).toHaveLength(0);

    const facts = await repo.listFacts(profileId);
    expect(facts).toHaveLength(5);
  });

  it('preserves profile isolation', async () => {
    const resume = baseResume();
    const profileA = await repo.createProfile().then((p) => p.id);
    const profileB = await repo.createProfile().then((p) => p.id);
    await migrateResumeToCareerKnowledge(resume, profileA);
    await migrateResumeToCareerKnowledge(resume, profileB);

    expect(await repo.listFacts(profileA)).toHaveLength(5);
    expect(await repo.listFacts(profileB)).toHaveLength(5);
    expect(await repo.listEvidence(profileA)).toHaveLength(5);
    expect(await repo.listEvidence(profileB)).toHaveLength(5);
  });

  it('skips empty skills and work entries', async () => {
    const resume: Resume = {
      ...baseResume(),
      parsedData: {
        ...baseResume().parsedData!,
        skills: [{ name: '', keywords: [] }],
        work: [{ name: '', position: '', startDate: '', endDate: '' }],
      },
    };
    const profileId = await repo.createProfile().then((p) => p.id);
    const result = await migrateResumeToCareerKnowledge(resume, profileId);
    expect(result.skipped.some((s) => s.path === 'skills[0].name')).toBe(true);
    expect(result.skipped.some((s) => s.path === 'work[0]')).toBe(true);
    expect(result.createdFacts).toHaveLength(3); // education, project, award
  });

  it('does not mutate the source Resume record', async () => {
    const resume = baseResume();
    const before = JSON.stringify(resume);
    const profileId = await repo.createProfile().then((p) => p.id);
    await migrateResumeToCareerKnowledge(resume, profileId);
    expect(JSON.stringify(resume)).toBe(before);
  });

  it('deterministic IDs are stable across runs', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    await migrateResumeToCareerKnowledge(resume, profileId);
    await migrateResumeToCareerKnowledge(resume, profileId);

    const expectedId = buildResumeFactId(profileId, resume.id, 'skills', 'Alice Example_0');
    const fact = await repo.getFact(expectedId);
    expect(fact).toBeDefined();
    expect(fact!.id).toBe(expectedId);
    expect(fact!.verificationState).toBe('needs_confirmation');
  });

  it('provenance survives database close/reopen', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    await migrateResumeToCareerKnowledge(resume, profileId);

    await db.close();
    expect(db.isOpen()).toBe(false);
    await db.open();

    const facts = await repo.listFacts(profileId);
    expect(facts).toHaveLength(5);
    const evidence = await repo.listEvidence(profileId);
    expect(evidence).toHaveLength(5);
  });
});

describe('explicit confirmation workflow', () => {
  it('user can confirm a migrated candidate', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const { createdFacts } = await migrateResumeToCareerKnowledge(resume, profileId);
    const factId = createdFacts[0].factId;

    const updated = await confirmMigratedCandidate(factId, 'user');
    expect(updated.verificationState).toBe('confirmed');

    const current = await repo.getFact(factId);
    expect(current?.verificationState).toBe('confirmed');
  });

  it('user can reject a migrated candidate', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const { createdFacts } = await migrateResumeToCareerKnowledge(resume, profileId);
    const factId = createdFacts[0].factId;

    const updated = await rejectMigratedCandidate(factId, 'user');
    expect(updated.verificationState).toBe('rejected');
  });

  it('non-user actor cannot confirm/reject', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const { createdFacts } = await migrateResumeToCareerKnowledge(resume, profileId);
    const factId = createdFacts[0].factId;

    await expect(rejectMigratedCandidate(factId, 'migration')).rejects.toThrow();
    await expect(confirmMigratedCandidate(factId, 'migration')).rejects.toThrow();

    const fact = await repo.getFact(factId);
    expect(fact?.verificationState).toBe('needs_confirmation');
  });

  it('invalidating a confirmed fact returns it to needs_confirmation', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const { createdFacts } = await migrateResumeToCareerKnowledge(resume, profileId);
    const factId = createdFacts[0].factId;

    await confirmMigratedCandidate(factId, 'user');
    await invalidateMigratedCandidate(factId, 'user');
    const fact = await repo.getFact(factId);
    expect(fact?.verificationState).toBe('needs_confirmation');
  });

  it('rejected fact stays rejected on re-migration', async () => {
    const resume = baseResume();
    const profileId = await repo.createProfile().then((p) => p.id);
    const { createdFacts } = await migrateResumeToCareerKnowledge(resume, profileId);
    const factId = createdFacts[0].factId;

    await rejectMigratedCandidate(factId, 'user');
    await migrateResumeToCareerKnowledge(resume, profileId);

    const fact = await repo.getFact(factId);
    expect(fact?.verificationState).toBe('rejected');
  });

  it('migrating Resume A and Resume B with overlapping content produces distinct provenance', async () => {
    const profileId = await repo.createProfile().then((p) => p.id);
    const resumeA = baseResume({ id: 101, fileName: 'v1.pdf' });
    const resumeB = baseResume({ id: 102, fileName: 'v2.pdf' });

    const resA = await migrateResumeToCareerKnowledge(resumeA, profileId);
    const resB = await migrateResumeToCareerKnowledge(resumeB, profileId);

    expect(resA.createdFacts).toHaveLength(5);
    expect(resB.createdFacts).toHaveLength(5);

    // Each resume's facts are distinct because resumeId is part of the deterministic identity
    const allFacts = await repo.listFacts(profileId);
    expect(allFacts).toHaveLength(10);

    const allEvidence = await repo.listEvidence(profileId);
    expect(allEvidence).toHaveLength(10);
    expect(allEvidence.some((e) => e.sourceRef?.includes('101'))).toBe(true);
    expect(allEvidence.some((e) => e.sourceRef?.includes('102'))).toBe(true);
  });

  it('guarantees arbitrary verificationState writes are impossible on repository API', () => {
    const untypedRepo = repo as unknown as Record<string, unknown>;
    expect(untypedRepo.updateFact).toBeUndefined();
    expect(untypedRepo.setVerificationState).toBeUndefined();
  });
});
