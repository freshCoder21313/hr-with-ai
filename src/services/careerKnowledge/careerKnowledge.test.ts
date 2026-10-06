import { describe, expect, it } from 'vitest';
import {
  canTransition,
  confirmCareerFact,
  createCareerEvidence,
  createCareerFact,
  createCareerNote,
  createCareerProfile,
  invalidateCareerFact,
  linkEvidence,
  rejectCareerFact,
  requestConfirmation,
  supersedeCareerFact,
  transitionVerification,
  updateCareerFactPresentation,
  updateCareerNote,
  VerificationTransitionError,
} from './careerKnowledge';
import type { Actor, CareerFact } from '@/types/careerKnowledge';

let counter = 0;
const ctx = {
  now: () => '2026-01-01T00:00:00.000Z',
  id: () => `id-${++counter}`,
};

const makeFact = (overrides: Partial<Parameters<typeof createCareerFact>[0]> = {}): CareerFact =>
  createCareerFact(
    {
      profileId: 'p1',
      category: 'skill',
      subject: 'Go',
      claim: 'Used Go in the payments service.',
      origin: 'user',
      ...overrides,
    },
    ctx
  );

describe('careerKnowledge — creation', () => {
  it('creates a valid fact defaulting to observed', () => {
    const fact = makeFact();
    expect(fact.verificationState).toBe('observed');
    expect(fact.claim).toBe('Used Go in the payments service.');
    expect(fact.id).toMatch(/^id-/);
  });

  it('rejects an invalid category', () => {
    expect(() => makeFact({ category: 'bogus' as never })).toThrow();
  });

  it('rejects an empty claim', () => {
    expect(() => makeFact({ claim: '' })).toThrow();
  });

  it('cannot be created directly in confirmed state (type + runtime)', () => {
    // @ts-expect-error confirmed is not an allowed creation state
    expect(() => makeFact({ verificationState: 'confirmed' })).toThrow();
  });

  it('user origin does not imply confirmed', () => {
    const fact = makeFact({ origin: 'user', verificationState: 'needs_confirmation' });
    expect(fact.origin).toBe('user');
    expect(fact.verificationState).toBe('needs_confirmation');
  });
});

describe('careerKnowledge — verification transitions', () => {
  it('observed -> needs_confirmation succeeds for a non-user actor', () => {
    const fact = requestConfirmation(makeFact(), 'ai', ctx);
    expect(fact.verificationState).toBe('needs_confirmation');
  });

  it('needs_confirmation -> confirmed succeeds only for user', () => {
    const fact = requestConfirmation(makeFact(), 'system', ctx);
    expect(confirmCareerFact(fact, 'user', ctx).verificationState).toBe('confirmed');
  });

  it('needs_confirmation -> rejected succeeds only for user', () => {
    const fact = requestConfirmation(makeFact(), 'system', ctx);
    expect(rejectCareerFact(fact, 'user', ctx).verificationState).toBe('rejected');
  });

  it('confirmed -> needs_confirmation requires explicit user invalidation', () => {
    const confirmed = confirmCareerFact(
      requestConfirmation(makeFact(), 'system', ctx),
      'user',
      ctx
    );
    expect(invalidateCareerFact(confirmed, 'user', ctx).verificationState).toBe(
      'needs_confirmation'
    );
    expect(() => invalidateCareerFact(confirmed, 'ai', ctx)).toThrow(VerificationTransitionError);
  });

  it('confirmed -> rejected requires explicit user action', () => {
    const confirmed = confirmCareerFact(
      requestConfirmation(makeFact(), 'system', ctx),
      'user',
      ctx
    );
    expect(rejectCareerFact(confirmed, 'user', ctx).verificationState).toBe('rejected');
  });

  it('observed -> rejected requires explicit user action', () => {
    expect(() => rejectCareerFact(makeFact(), 'ai', ctx)).toThrow(VerificationTransitionError);
    expect(rejectCareerFact(makeFact(), 'user', ctx).verificationState).toBe('rejected');
  });

  const machineActors: Actor[] = ['ai', 'migration', 'external', 'system'];
  it.each(machineActors)('machine actor "%s" cannot confirm', (actor) => {
    const fact = requestConfirmation(makeFact(), 'system', ctx);
    expect(() => confirmCareerFact(fact, actor, ctx)).toThrow(VerificationTransitionError);
    expect(canTransition('needs_confirmation', 'confirmed', actor)).toBe(false);
  });

  it('ai-origin and migration-origin facts cannot self-confirm', () => {
    for (const origin of ['ai_inference', 'migration', 'external'] as const) {
      const fact = requestConfirmation(makeFact({ origin }), 'system', ctx);
      expect(() => confirmCareerFact(fact, 'ai', ctx)).toThrow();
      expect(() => confirmCareerFact(fact, 'migration', ctx)).toThrow();
    }
  });

  it('forbids undefined transitions such as observed -> confirmed', () => {
    expect(() => transitionVerification(makeFact(), 'confirmed', 'user', ctx)).toThrow(
      VerificationTransitionError
    );
  });
});

describe('careerKnowledge — claim scope', () => {
  it('confirming one fact does not modify another', () => {
    const a = requestConfirmation(makeFact({ subject: 'Go' }), 'system', ctx);
    const b = makeFact({ subject: 'Rust' });
    const confirmedA = confirmCareerFact(a, 'user', ctx);
    expect(confirmedA.verificationState).toBe('confirmed');
    expect(b.verificationState).toBe('observed');
    expect(confirmedA.id).not.toBe(b.id);
  });

  it('linking evidence to fact A does not confirm fact B', () => {
    const a = makeFact();
    const b = makeFact({ subject: 'Rust' });
    const evidence = createCareerEvidence({ profileId: 'p1', sourceType: 'github' }, ctx);
    linkEvidence(a.id, evidence.id, 'supports');
    expect(a.verificationState).toBe('observed');
    expect(b.verificationState).toBe('observed');
  });
});

describe('careerKnowledge — evidence', () => {
  it('evidence carries no verification state', () => {
    const evidence = createCareerEvidence(
      { profileId: 'p1', sourceType: 'github', url: 'https://x' },
      ctx
    );
    expect('verificationState' in evidence).toBe(false);
  });

  it('supports multiple relationship kinds without affecting state', () => {
    const fact = makeFact();
    const ev = createCareerEvidence({ profileId: 'p1', sourceType: 'web_search' }, ctx);
    expect(linkEvidence(fact.id, ev.id, 'supports').relation).toBe('supports');
    expect(linkEvidence(fact.id, ev.id, 'contradicts').relation).toBe('contradicts');
    expect(linkEvidence(fact.id, ev.id, 'contextual').relation).toBe('contextual');
    expect(fact.verificationState).toBe('observed');
  });
});

describe('careerKnowledge — notes', () => {
  it('attaches a note to a fact without becoming a fact', () => {
    const fact = makeFact();
    const note = createCareerNote({ factId: fact.id, text: 'Emphasize technical ownership.' }, ctx);
    expect(note.factId).toBe(fact.id);
    expect(note.scope).toBe('global');
    expect('verificationState' in note).toBe(false);
    expect('claim' in note).toBe(false);
  });

  it('note updates do not alter fact verification state', () => {
    const fact = makeFact();
    const note = createCareerNote({ factId: fact.id, text: 'a' }, ctx);
    const updated = updateCareerNote(note, 'b', ctx);
    expect(updated.text).toBe('b');
    expect(fact.verificationState).toBe('observed');
  });
});

describe('careerKnowledge — update semantics', () => {
  it('presentation-neutral update preserves identity and state', () => {
    const confirmed = confirmCareerFact(
      requestConfirmation(makeFact(), 'system', ctx),
      'user',
      ctx
    );
    const fixed = updateCareerFactPresentation(
      confirmed,
      { claim: 'Used Go in the payments service (prod).' },
      ctx
    );
    expect(fixed.id).toBe(confirmed.id);
    expect(fixed.verificationState).toBe('confirmed');
  });

  it('semantic change produces a superseding fact and does not rewrite the old claim', () => {
    const confirmed = confirmCareerFact(
      requestConfirmation(makeFact(), 'system', ctx),
      'user',
      ctx
    );
    const { previous, next } = supersedeCareerFact(
      confirmed,
      { claim: 'Led the Go payments rewrite.' },
      ctx
    );
    expect(previous.id).toBe(confirmed.id);
    expect(previous.claim).toBe('Used Go in the payments service.');
    expect(previous.supersededBy).toBe(next.id);
    expect(next.id).not.toBe(previous.id);
    expect(next.claim).toBe('Led the Go payments rewrite.');
    expect(next.verificationState).toBe('needs_confirmation');
  });
});

describe('careerKnowledge — profile', () => {
  it('creates a profile with schema version', () => {
    const profile = createCareerProfile(ctx);
    expect(profile.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(profile.createdAt).toBe(profile.updatedAt);
  });
});
