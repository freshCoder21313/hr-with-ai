// Career Knowledge → Resume projection tests (Phase 6).
//
// Pure-function tests: hand-built CareerFact objects, no IndexedDB, no AI.
// The projection is one-way and deterministic — Career Knowledge is never
// mutated and the resume never writes back into the fact store.

import { describe, expect, it } from 'vitest';
import {
  isFactProjectable,
  projectCareerKnowledgeToResume,
  refreshResumeWithProjection,
} from '@/services/careerKnowledge/projection';
import type { CareerFact } from '@/types/careerKnowledge';
import type { ResumeData } from '@/types/resume';

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

let seq = 0;
function fact(overrides: Partial<CareerFact> = {}): CareerFact {
  seq += 1;
  return {
    id: `fact-${seq}`,
    profileId: PROFILE_A,
    category: 'skill',
    subject: 'Go',
    claim: 'Writes Go in production',
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const emptyResume = (): ResumeData => ({
  basics: { name: '', label: '', email: '', summary: '' },
  work: [],
  education: [],
  skills: [],
  projects: [],
});

/** Attribution tag carried by every projected entity, read without asserting its shape. */
function attributionOf(entity: object): string[] {
  if (!('derivedFromFactIds' in entity) || !Array.isArray(entity.derivedFromFactIds)) return [];
  return entity.derivedFromFactIds.filter((id): id is string => typeof id === 'string');
}

describe('projection: category mapping', () => {
  it('projects a skill fact into ResumeData.skills', () => {
    const f = fact({
      category: 'skill',
      subject: 'TypeScript',
      structured: { skill: 'TypeScript', level: 'Advanced', keywords: ['tsc', 'generics'] },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.skills).toHaveLength(1);
    expect(resumeData.skills[0]).toMatchObject({
      name: 'TypeScript',
      level: 'Advanced',
      keywords: ['tsc', 'generics'],
    });
  });

  it('falls back from structured.skill to structured.name to subject', () => {
    const named = fact({ category: 'skill', subject: 'Zig', structured: { name: 'Ziglang' } });
    const bare = fact({ category: 'skill', subject: 'Rust' });

    const withName = projectCareerKnowledgeToResume([named], { profileId: PROFILE_A });
    const withSubject = projectCareerKnowledgeToResume([bare], { profileId: PROFILE_A });

    expect(withName.resumeData.skills[0].name).toBe('Ziglang');
    expect(withSubject.resumeData.skills[0].name).toBe('Rust');
  });

  it('projects an experience fact into ResumeData.work', () => {
    const f = fact({
      category: 'experience',
      subject: 'Acme Corp',
      claim: 'Built the payments service',
      structured: {
        company: 'Acme Corp',
        role: 'Senior Engineer',
        start: '2022-01',
        end: '2024-06',
      },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.work).toHaveLength(1);
    expect(resumeData.work[0]).toMatchObject({
      name: 'Acme Corp',
      position: 'Senior Engineer',
      startDate: '2022-01',
      endDate: '2024-06',
      summary: 'Built the payments service',
    });
  });

  it('accepts startDate/endDate as well as start/end', () => {
    const f = fact({
      category: 'experience',
      subject: 'Acme',
      structured: { startDate: '2020-05', endDate: '2021-05' },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.work[0].startDate).toBe('2020-05');
    expect(resumeData.work[0].endDate).toBe('2021-05');
  });

  it('projects an experience fact without a structured role to an empty position', () => {
    const f = fact({
      category: 'experience',
      subject: 'Globex',
      structured: { company: 'Globex' },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.work[0].name).toBe('Globex');
    expect(resumeData.work[0].position).toBe('');
  });

  it('projects a project fact into ResumeData.projects', () => {
    const f = fact({
      category: 'project',
      subject: 'Ledger Service',
      claim: 'Ledger service with idempotent writes',
      structured: {
        project: 'Ledger Service',
        description: 'Structured description',
        keywords: ['Go', 'Postgres'],
      },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.projects).toHaveLength(1);
    expect(resumeData.projects[0]).toMatchObject({
      name: 'Ledger Service',
      description: 'Structured description',
      keywords: ['Go', 'Postgres'],
    });
  });

  it('falls back to the claim for a project description when none is structured', () => {
    const f = fact({ category: 'project', subject: 'Tooling', claim: 'Internal CLI tooling' });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.projects[0].description).toBe('Internal CLI tooling');
  });

  it('projects an education fact into ResumeData.education', () => {
    const f = fact({
      category: 'education',
      subject: 'MIT',
      structured: {
        institution: 'MIT',
        studyType: 'BS',
        area: 'Computer Science',
        start: '2016',
        end: '2020',
      },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.education).toHaveLength(1);
    expect(resumeData.education[0]).toMatchObject({
      institution: 'MIT',
      studyType: 'BS',
      area: 'Computer Science',
      startDate: '2016',
      endDate: '2020',
    });
  });

  it('projects an achievement fact into ResumeData.awards', () => {
    const f = fact({
      category: 'achievement',
      subject: 'Employee of the Year',
      claim: 'Won employee of the year',
      structured: { awarder: 'Acme Corp', date: '2023' },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.awards).toHaveLength(1);
    expect(resumeData.awards?.[0]).toMatchObject({
      title: 'Employee of the Year',
      awarder: 'Acme Corp',
      date: '2023',
      summary: 'Won employee of the year',
    });
  });

  it('omits an award summary that would merely repeat the title', () => {
    const f = fact({
      category: 'achievement',
      subject: 'Employee of the Year',
      claim: 'Employee of the Year',
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.awards?.[0].summary).toBeUndefined();
  });

  it('never projects certification, preference or goal facts', () => {
    const facts = [
      fact({ category: 'certification', subject: 'AWS SAA' }),
      fact({ category: 'preference', subject: 'Remote' }),
      fact({ category: 'goal', subject: 'Staff engineer' }),
    ];

    const { resumeData, skipped } = projectCareerKnowledgeToResume(facts, { profileId: PROFILE_A });

    expect(resumeData.work).toHaveLength(0);
    expect(resumeData.education).toHaveLength(0);
    expect(resumeData.skills).toHaveLength(0);
    expect(resumeData.projects).toHaveLength(0);
    expect(resumeData.awards).toHaveLength(0);
    expect(skipped.map((s) => s.reason)).toEqual([
      'unmapped-category',
      'unmapped-category',
      'unmapped-category',
    ]);
  });
});

describe('projection: verification filter', () => {
  it('projects only confirmed facts', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Go', verificationState: 'confirmed' }),
      fact({ category: 'skill', subject: 'Java', verificationState: 'observed' }),
      fact({ category: 'skill', subject: 'Ruby', verificationState: 'needs_confirmation' }),
      fact({ category: 'skill', subject: 'Perl', verificationState: 'rejected' }),
    ];

    const { resumeData, skipped, attributions } = projectCareerKnowledgeToResume(facts, {
      profileId: PROFILE_A,
    });

    expect(resumeData.skills.map((s) => s.name)).toEqual(['Go']);
    expect(skipped.map((s) => s.reason)).toEqual(['unverified', 'unverified', 'unverified']);
    expect(attributions.map((a) => a.factId)).toEqual([facts[0].id]);
  });

  it('isFactProjectable is true only for confirmed, current, mappable facts of that profile', () => {
    expect(isFactProjectable(fact({ verificationState: 'confirmed' }), PROFILE_A)).toBe(true);
    expect(isFactProjectable(fact({ verificationState: 'observed' }), PROFILE_A)).toBe(false);
    expect(isFactProjectable(fact({ verificationState: 'needs_confirmation' }), PROFILE_A)).toBe(
      false
    );
    expect(isFactProjectable(fact({ verificationState: 'rejected' }), PROFILE_A)).toBe(false);
    expect(
      isFactProjectable(fact({ verificationState: 'confirmed', supersededBy: 'fact-x' }), PROFILE_A)
    ).toBe(false);
    expect(isFactProjectable(fact({ category: 'goal' }), PROFILE_A)).toBe(false);
    expect(isFactProjectable(fact({ verificationState: 'confirmed' }), PROFILE_B)).toBe(false);
  });

  it('honours includeCategories as a projection filter', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Go' }),
      fact({ category: 'experience', subject: 'Acme' }),
    ];

    const { resumeData, skipped } = projectCareerKnowledgeToResume(facts, {
      profileId: PROFILE_A,
      includeCategories: ['skill'],
    });

    expect(resumeData.skills).toHaveLength(1);
    expect(resumeData.work).toHaveLength(0);
    expect(skipped).toEqual([{ factId: facts[1].id, reason: 'unmapped-category' }]);
  });
});

describe('projection: superseded facts', () => {
  it('excludes a superseded fact and projects its successor', () => {
    const successor = fact({
      category: 'experience',
      subject: 'Acme Corp',
      structured: { company: 'Acme Corp' },
    });
    const stale = fact({
      category: 'experience',
      subject: 'Acme Corp',
      supersededBy: successor.id,
    });

    const { resumeData, skipped } = projectCareerKnowledgeToResume([stale, successor], {
      profileId: PROFILE_A,
    });

    expect(resumeData.work).toHaveLength(1);
    expect(attributionOf(resumeData.work[0])).toEqual([successor.id]);
    expect(skipped).toEqual([{ factId: stale.id, reason: 'superseded' }]);
  });
});

describe('projection: attribution', () => {
  it('attaches a single-fact derivedFromFactIds to every projected entity', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Go' }),
      fact({ category: 'experience', subject: 'Acme' }),
      fact({ category: 'project', subject: 'Ledger' }),
      fact({ category: 'education', subject: 'MIT' }),
      fact({ category: 'achievement', subject: 'Award' }),
    ];

    const { resumeData } = projectCareerKnowledgeToResume(facts, { profileId: PROFILE_A });

    const ids = [
      ...resumeData.skills,
      ...resumeData.work,
      ...resumeData.projects,
      ...resumeData.education,
      ...(resumeData.awards ?? []),
    ].map(attributionOf);

    expect(ids).toHaveLength(5);
    for (const id of ids) expect(id).toHaveLength(1);

    // No fuzzy merge: five entities trace to five distinct facts.
    const flat = ids.flat().sort();
    expect(flat).toHaveLength(5);
    expect(flat).toEqual(facts.map((f) => f.id).sort());
  });

  it('points each attribution at the entity’s final post-sort position', () => {
    const first = fact({ category: 'skill', subject: 'Alpha' });
    const second = fact({ category: 'skill', subject: 'Beta' });
    const work = fact({ category: 'experience', subject: 'Acme' });

    const { attributions } = projectCareerKnowledgeToResume([second, work, first], {
      profileId: PROFILE_A,
    });

    expect(attributions).toEqual([
      { factId: work.id, section: 'work', index: 0 },
      { factId: first.id, section: 'skills', index: 0 },
      { factId: second.id, section: 'skills', index: 1 },
    ]);
  });

  it('does not attribute skipped facts', () => {
    const confirmed = fact({ category: 'skill', subject: 'Go' });
    const rejected = fact({ category: 'skill', subject: 'Java', verificationState: 'rejected' });

    const { attributions } = projectCareerKnowledgeToResume([confirmed, rejected], {
      profileId: PROFILE_A,
    });

    expect(attributions).toEqual([{ factId: confirmed.id, section: 'skills', index: 0 }]);
  });
});

describe('projection: profile isolation', () => {
  it('uses only facts belonging to the requested profile', () => {
    const mine = fact({ category: 'skill', subject: 'Go', profileId: PROFILE_A });
    const theirs = fact({ category: 'skill', subject: 'Rust', profileId: PROFILE_B });

    const { resumeData, attributions, skipped } = projectCareerKnowledgeToResume([mine, theirs], {
      profileId: PROFILE_A,
    });

    expect(resumeData.skills.map((s) => s.name)).toEqual(['Go']);
    expect(attributions.map((a) => a.factId)).toEqual([mine.id]);
    expect(skipped).toEqual([{ factId: theirs.id, reason: 'profile-mismatch' }]);
  });

  it('produces disjoint projections for two profiles over the same fact pool', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Go', profileId: PROFILE_A }),
      fact({ category: 'skill', subject: 'Rust', profileId: PROFILE_B }),
    ];

    const forA = projectCareerKnowledgeToResume(facts, { profileId: PROFILE_A });
    const forB = projectCareerKnowledgeToResume(facts, { profileId: PROFILE_B });

    expect(forA.resumeData.skills.map((s) => s.name)).toEqual(['Go']);
    expect(forB.resumeData.skills.map((s) => s.name)).toEqual(['Rust']);
  });
});

describe('projection: determinism', () => {
  it('produces identical output across runs regardless of input order', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Zig' }),
      fact({ category: 'skill', subject: 'Ada' }),
      fact({ category: 'experience', subject: 'Zeta Inc' }),
      fact({ category: 'experience', subject: 'Acme' }),
    ];

    const first = projectCareerKnowledgeToResume(facts, { profileId: PROFILE_A });
    const second = projectCareerKnowledgeToResume([...facts].reverse(), { profileId: PROFILE_A });

    expect(second).toEqual(first);
    expect(first.resumeData.skills.map((s) => s.name)).toEqual(['Ada', 'Zig']);
    expect(first.resumeData.work.map((w) => w.name)).toEqual(['Acme', 'Zeta Inc']);
  });

  it('breaks subject ties by fact id', () => {
    const a = fact({ id: 'fact-a', category: 'skill', subject: 'Same' });
    const b = fact({ id: 'fact-b', category: 'skill', subject: 'Same' });

    const { attributions } = projectCareerKnowledgeToResume([b, a], { profileId: PROFILE_A });

    expect(attributions.map((x) => x.factId)).toEqual(['fact-a', 'fact-b']);
  });
});

describe('projection: preservation of resume-local fields', () => {
  const localResume = (): ResumeData => ({
    basics: {
      name: 'Alice Example',
      label: 'Engineer',
      email: 'alice@example.com',
      summary: 'Local summary text that must survive projection.',
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    volunteer: [{ organization: 'Code Club', position: 'Mentor' }],
    languages: [{ language: 'Vietnamese', fluency: 'Native' }],
    interests: [{ name: 'Cycling', keywords: ['road'] }],
    references: [{ name: 'Ref', reference: 'ref@example.com' }],
    language: 'vi',
    meta: { template: 'modern', theme: 'blue', lastParsedRawText: 'RAW' },
  });

  it('carries every resume-local field through a refresh untouched', () => {
    const before = localResume();
    const projection = projectCareerKnowledgeToResume(
      [fact({ category: 'skill', subject: 'Go' })],
      {
        profileId: PROFILE_A,
        baseResume: before,
      }
    );

    const resumed = refreshResumeWithProjection(before, projection);

    expect(resumed.basics).toEqual(before.basics);
    expect(resumed.meta).toEqual(before.meta);
    expect(resumed.volunteer).toEqual(before.volunteer);
    expect(resumed.languages).toEqual(before.languages);
    expect(resumed.interests).toEqual(before.interests);
    expect(resumed.references).toEqual(before.references);
    expect(resumed.language).toBe('vi');
    expect(resumed.skills.map((s) => s.name)).toEqual(['Go']);
  });

  it('baseResume seeds basics through the projection itself', () => {
    const before = localResume();

    const { resumeData } = projectCareerKnowledgeToResume(
      [fact({ category: 'skill', subject: 'Go' })],
      {
        profileId: PROFILE_A,
        baseResume: before,
      }
    );

    expect(resumeData.basics.name).toBe('Alice Example');
    expect(resumeData.volunteer).toEqual(before.volunteer);
  });

  it('does not mutate the resume it was handed', () => {
    const before = localResume();
    const snapshot = JSON.parse(JSON.stringify(before));
    const projection = projectCareerKnowledgeToResume(
      [fact({ category: 'skill', subject: 'Go' })],
      {
        profileId: PROFILE_A,
      }
    );

    refreshResumeWithProjection(before, projection);

    expect(before).toEqual(snapshot);
  });
});

describe('projection: no mutation of Career Knowledge', () => {
  it('leaves the input facts byte-identical', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Go', structured: { skill: 'Go' } }),
      fact({ category: 'experience', subject: 'Acme', structured: { company: 'Acme' } }),
      fact({ category: 'skill', subject: 'Java', verificationState: 'observed' }),
      fact({
        category: 'skill',
        subject: 'Ruby',
        verificationState: 'confirmed',
        supersededBy: 'other',
      }),
    ];
    const snapshot = JSON.parse(JSON.stringify(facts));
    const frozen = facts.map((f) => Object.freeze({ ...f }));

    projectCareerKnowledgeToResume(frozen, { profileId: PROFILE_A });
    refreshResumeWithProjection(
      emptyResume(),
      projectCareerKnowledgeToResume(frozen, { profileId: PROFILE_A })
    );

    expect(frozen).toEqual(snapshot);
  });
});

describe('projection: no invention', () => {
  it('never embellishes a bare skill name with seniority or level text', () => {
    const f = fact({ category: 'skill', subject: 'Go', claim: 'Go' });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect(resumeData.skills[0].name).toBe('Go');
    expect(resumeData.skills[0].name).not.toMatch(/expert|senior|advanced|beginner|proficient/i);
    expect('level' in resumeData.skills[0]).toBe(false);
    expect('keywords' in resumeData.skills[0]).toBe(false);
  });

  it('ignores blank and non-string structured values instead of emitting them', () => {
    const f = fact({
      category: 'skill',
      subject: 'Go',
      structured: { level: '   ', keywords: ['  ', ''] },
    });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    expect('level' in resumeData.skills[0]).toBe(false);
    expect('keywords' in resumeData.skills[0]).toBe(false);
  });

  it('leaves fields undefined rather than inventing dates, urls or roles', () => {
    const f = fact({ category: 'project', subject: 'Tooling' });

    const { resumeData } = projectCareerKnowledgeToResume([f], { profileId: PROFILE_A });

    const projected = resumeData.projects[0];
    for (const invented of ['startDate', 'endDate', 'url', 'roles', 'highlights'] as const) {
      expect(invented in projected).toBe(false);
    }
  });
});

describe('projection: round trip', () => {
  it('a second refresh over its own output adds no duplicates', () => {
    const facts = [
      fact({ category: 'skill', subject: 'Go' }),
      fact({ category: 'experience', subject: 'Acme' }),
      fact({ category: 'project', subject: 'Ledger' }),
      fact({ category: 'education', subject: 'MIT' }),
      fact({ category: 'achievement', subject: 'Award' }),
    ];
    const projection = projectCareerKnowledgeToResume(facts, { profileId: PROFILE_A });

    const first = refreshResumeWithProjection(emptyResume(), projection);
    const second = refreshResumeWithProjection(first, projection);

    expect(second).toEqual(first);
    expect(second.skills).toHaveLength(1);
    expect(second.work).toHaveLength(1);
    expect(second.projects).toHaveLength(1);
    expect(second.education).toHaveLength(1);
    expect(second.awards).toHaveLength(1);
  });

  it('replaces, rather than appends to, projection-owned sections on refresh', () => {
    const base: ResumeData = {
      ...emptyResume(),
      skills: [{ name: 'Stale manual entry', keywords: ['old'] }],
    };
    const projection = projectCareerKnowledgeToResume(
      [fact({ category: 'skill', subject: 'Go' })],
      {
        profileId: PROFILE_A,
      }
    );

    const resumed = refreshResumeWithProjection(base, projection);

    expect(resumed.skills.map((s) => s.name)).toEqual(['Go']);
    expect(base.skills.map((s) => s.name)).toEqual(['Stale manual entry']);
  });

  it('idempotent over a resume that already carries local sections', () => {
    const seed: ResumeData = {
      ...emptyResume(),
      basics: { name: 'A', label: 'L', email: 'e', summary: 'S' },
      volunteer: [{ organization: 'Code Club' }],
    };
    const projection = projectCareerKnowledgeToResume(
      [fact({ category: 'skill', subject: 'Go' })],
      {
        profileId: PROFILE_A,
      }
    );

    const first = refreshResumeWithProjection(seed, projection);
    const second = refreshResumeWithProjection(first, projection);

    expect(second).toEqual(first);
    expect(second.volunteer).toEqual(seed.volunteer);
    expect(second.skills).toHaveLength(1);
  });
});
