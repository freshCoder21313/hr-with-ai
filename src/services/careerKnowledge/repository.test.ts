// Career Knowledge local persistence tests (Phase 2).
//
// Uses fake-indexeddb so Dexie runs against a real IndexedDB implementation
// in the jsdom test environment. This is required to prove durability across
// a database close/reopen boundary — an in-memory repository stub would not.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { CareerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import { VerificationTransitionError } from '@/services/careerKnowledge/careerKnowledge';

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

async function newProfileId(): Promise<string> {
  const profile = await repo.createProfile();
  return profile.id;
}

describe('CareerKnowledgeRepository - profile', () => {
  it('creates, retrieves, updates, and deletes a profile', async () => {
    const profile = await repo.createProfile();
    expect(await repo.getProfile(profile.id)).toEqual(profile);

    const updated = await repo.saveProfile({ ...profile, updatedAt: '2099-01-01T00:00:00.000Z' });
    expect((await repo.getProfile(profile.id))?.updatedAt).toBe(updated.updatedAt);

    await repo.deleteProfile(profile.id);
    expect(await repo.getProfile(profile.id)).toBeUndefined();
  });

  it('deleting a profile removes its facts, evidence, links, and notes', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go in the payments service.',
      origin: 'user',
    });
    const evidence = await repo.createEvidence({ profileId, sourceType: 'user' });
    await repo.linkEvidenceToFact(fact.id, evidence.id, 'supports');
    await repo.createNote({ factId: fact.id, text: 'Emphasize ownership.' });

    await repo.deleteProfile(profileId);

    expect(await repo.listFacts(profileId)).toHaveLength(0);
    expect(await repo.listEvidence(profileId)).toHaveLength(0);
    expect(await repo.listLinksForFact(fact.id)).toHaveLength(0);
    expect(await repo.listNotesForFact(fact.id)).toHaveLength(0);
  });
});

describe('CareerKnowledgeRepository - facts CRUD', () => {
  it('creates, retrieves, and lists facts by profile', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'experience',
      subject: 'Acme',
      claim: 'Worked at Acme from 2022 to 2024.',
      origin: 'user',
    });
    expect(await repo.getFact(fact.id)).toEqual(fact);
    expect(await repo.listFacts(profileId)).toEqual([fact]);
  });

  it('defaults new facts to observed and never confirmed', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'external',
    });
    expect(fact.verificationState).toBe('observed');
  });

  it('applies presentation-neutral updates without changing verification', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go in paymnts service.',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });
    const fixed = await repo.updateFactPresentation(fact.id, {
      claim: 'Used Go in payments service.',
    });
    expect(fixed.claim).toBe('Used Go in payments service.');
    expect(fixed.verificationState).toBe('needs_confirmation');
    expect((await repo.getFact(fact.id))?.claim).toBe('Used Go in payments service.');
  });

  it('deletes a fact and its links/notes but retains evidence', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'project',
      subject: 'X',
      claim: 'Built X.',
      origin: 'user',
    });
    const evidence = await repo.createEvidence({ profileId, sourceType: 'github' });
    await repo.linkEvidenceToFact(fact.id, evidence.id, 'supports');
    await repo.createNote({ factId: fact.id, text: 'note' });

    await repo.deleteFact(fact.id);

    expect(await repo.getFact(fact.id)).toBeUndefined();
    expect(await repo.listLinksForFact(fact.id)).toHaveLength(0);
    expect(await repo.listNotesForFact(fact.id)).toHaveLength(0);
    // Evidence survives — reusable provenance.
    expect(await repo.getEvidence(evidence.id)).toBeDefined();
  });
});

describe('CareerKnowledgeRepository - verification invariants', () => {
  it('confirmation requires the domain transition and persists', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });
    const confirmed = await repo.confirmFact(fact.id, 'user');
    expect(confirmed.verificationState).toBe('confirmed');
    expect((await repo.getFact(fact.id))?.verificationState).toBe('confirmed');
  });

  it('rejects machine actors confirming a fact (no persisted change)', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'ai_inference',
      verificationState: 'needs_confirmation',
    });
    await expect(repo.confirmFact(fact.id, 'ai')).rejects.toBeInstanceOf(
      VerificationTransitionError
    );
    expect((await repo.getFact(fact.id))?.verificationState).toBe('needs_confirmation');
  });

  it('rejects an invalid transition (observed -> confirmed)', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'external',
    });
    await expect(repo.confirmFact(fact.id, 'user')).rejects.toBeInstanceOf(
      VerificationTransitionError
    );
    expect((await repo.getFact(fact.id))?.verificationState).toBe('observed');
  });

  it('requires the domain transition for rejection (user only)', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });
    await expect(repo.rejectFact(fact.id, 'migration')).rejects.toBeInstanceOf(
      VerificationTransitionError
    );
    const rejected = await repo.rejectFact(fact.id, 'user');
    expect(rejected.verificationState).toBe('rejected');
  });
});

describe('CareerKnowledgeRepository - profile isolation', () => {
  it('never returns another profile facts/evidence/notes', async () => {
    const a = await newProfileId();
    const b = await newProfileId();
    const a1 = await repo.createFact({
      profileId: a,
      category: 'skill',
      subject: 's',
      claim: 'A1',
      origin: 'user',
    });
    const a2 = await repo.createFact({
      profileId: a,
      category: 'skill',
      subject: 's',
      claim: 'A2',
      origin: 'user',
    });
    await repo.createFact({
      profileId: b,
      category: 'skill',
      subject: 's',
      claim: 'B1',
      origin: 'user',
    });
    await repo.createFact({
      profileId: b,
      category: 'skill',
      subject: 's',
      claim: 'B2',
      origin: 'user',
    });

    const aFacts = await repo.listFacts(a);
    expect(aFacts.map((f) => f.id).sort()).toEqual([a1.id, a2.id].sort());
    expect(aFacts.every((f) => f.profileId === a)).toBe(true);

    await repo.createEvidence({ profileId: a, sourceType: 'user' });
    await repo.createEvidence({ profileId: b, sourceType: 'user' });
    expect(await repo.listEvidence(a)).toHaveLength(1);

    await repo.createNote({ factId: a1.id, text: 'a-note' });
    const bNotes = await repo.listNotesForProfile(b);
    expect(bNotes).toHaveLength(0);
    expect(await repo.listNotesForProfile(a)).toHaveLength(1);
  });
});

describe('CareerKnowledgeRepository - evidence relationships', () => {
  it('links evidence to a fact and reads it back both directions', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'project',
      subject: 'X',
      claim: 'Built X.',
      origin: 'user',
    });
    const evidence = await repo.createEvidence({
      profileId,
      sourceType: 'github',
      url: 'https://example/x',
    });

    await repo.linkEvidenceToFact(fact.id, evidence.id, 'supports');

    const linked = await repo.listEvidenceForFact(fact.id);
    expect(linked.map((e) => e.id)).toEqual([evidence.id]);
    const supporting = await repo.listFactsForEvidence(evidence.id);
    expect(supporting.map((f) => f.id)).toEqual([fact.id]);
  });

  it('allows one evidence item to support multiple facts', async () => {
    const profileId = await newProfileId();
    const f1 = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go in repo X.',
      origin: 'external',
    });
    const f2 = await repo.createFact({
      profileId,
      category: 'project',
      subject: 'X',
      claim: 'Contributed to repo X.',
      origin: 'external',
    });
    const evidence = await repo.createEvidence({
      profileId,
      sourceType: 'github',
      sourceRef: 'repo-x',
    });

    await repo.linkEvidenceToFact(f1.id, evidence.id, 'supports');
    await repo.linkEvidenceToFact(f2.id, evidence.id, 'contextual');

    const facts = await repo.listFactsForEvidence(evidence.id);
    expect(facts.map((f) => f.id).sort()).toEqual([f1.id, f2.id].sort());
  });

  it('linking never changes the fact verification state', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'external',
    });
    const evidence = await repo.createEvidence({ profileId, sourceType: 'github' });
    await repo.linkEvidenceToFact(fact.id, evidence.id, 'supports');
    expect((await repo.getFact(fact.id))?.verificationState).toBe('observed');
  });

  it('unlinks evidence and deletes evidence removing its links', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'project',
      subject: 'X',
      claim: 'Built X.',
      origin: 'user',
    });
    const evidence = await repo.createEvidence({ profileId, sourceType: 'github' });
    await repo.linkEvidenceToFact(fact.id, evidence.id, 'supports');

    await repo.unlinkEvidenceFromFact(fact.id, evidence.id);
    expect(await repo.listEvidenceForFact(fact.id)).toHaveLength(0);

    await repo.linkEvidenceToFact(fact.id, evidence.id, 'supports');
    await repo.deleteEvidence(evidence.id);
    expect(await repo.getEvidence(evidence.id)).toBeUndefined();
    expect(await repo.listLinksForFact(fact.id)).toHaveLength(0);
    // Fact itself survives evidence deletion.
    expect(await repo.getFact(fact.id)).toBeDefined();
  });

  it('rejects cross-profile links', async () => {
    const a = await newProfileId();
    const b = await newProfileId();
    const fact = await repo.createFact({
      profileId: a,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'user',
    });
    const evidence = await repo.createEvidence({ profileId: b, sourceType: 'user' });
    await expect(repo.linkEvidenceToFact(fact.id, evidence.id, 'supports')).rejects.toThrow(
      /different profiles/
    );
  });
});

describe('CareerKnowledgeRepository - supersession', () => {
  it('creates a replacement fact and marks the old one superseded without deleting it', async () => {
    const profileId = await newProfileId();
    const original = await repo.createFact({
      profileId,
      category: 'achievement',
      subject: 'deploy',
      claim: 'Reduced deployment time.',
      origin: 'user',
    });
    const { previous, next } = await repo.supersedeFact(original.id, {
      claim: 'Reduced deployment time by 40%.',
    });

    expect(previous.id).toBe(original.id);
    expect(previous.supersededBy).toBe(next.id);
    expect(next.verificationState).toBe('needs_confirmation');

    // Both facts persist; history is retained.
    expect((await repo.getFact(original.id))?.supersededBy).toBe(next.id);
    expect(await repo.getFact(next.id)).toBeDefined();
    expect(await repo.listFacts(profileId)).toHaveLength(2);
  });
});

describe('CareerKnowledgeRepository - notes', () => {
  it('creates, reads, updates, lists, and deletes notes independently from facts', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'experience',
      subject: 'Acme',
      claim: 'Led migration.',
      origin: 'user',
    });
    const note = await repo.createNote({ factId: fact.id, text: 'Emphasize technical ownership.' });

    expect(await repo.getNote(note.id)).toEqual(note);
    expect(await repo.listNotesForFact(fact.id)).toEqual([note]);

    const updated = await repo.updateNote(note.id, 'Do not imply people-management.');
    expect(updated.text).toBe('Do not imply people-management.');
    expect((await repo.getNote(note.id))?.text).toBe('Do not imply people-management.');

    await repo.deleteNote(note.id);
    expect(await repo.getNote(note.id)).toBeUndefined();
    // The fact is unaffected by note deletion.
    expect(await repo.getFact(fact.id)).toBeDefined();
  });
});

describe('CareerKnowledgeRepository - durability across reopen', () => {
  it('persists facts, supersession, links, and notes across db close/reopen', async () => {
    const profileId = await newProfileId();
    const fact = await repo.createFact({
      profileId,
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go.',
      origin: 'user',
      verificationState: 'needs_confirmation',
    });
    await repo.confirmFact(fact.id, 'user');
    const { next } = await repo.supersedeFact(fact.id, { claim: 'Used Go for 4 years.' });
    const evidence = await repo.createEvidence({ profileId, sourceType: 'github' });
    await repo.linkEvidenceToFact(next.id, evidence.id, 'supports');
    await repo.createNote({ factId: next.id, text: 'keep' });

    // Close and reopen the underlying IndexedDB; data must survive.
    await db.close();
    await db.open();

    const reloaded = await repo.getFact(fact.id);
    expect(reloaded?.verificationState).toBe('confirmed');
    expect(reloaded?.supersededBy).toBe(next.id);
    expect(await repo.listFacts(profileId)).toHaveLength(2);
    expect(await repo.listEvidenceForFact(next.id)).toHaveLength(1);
    expect(await repo.listNotesForFact(next.id)).toHaveLength(1);
  });
});
