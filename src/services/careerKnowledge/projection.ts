// Phase 6 — Career Knowledge → Resume projection.
//
// One-way, deterministic projection of confirmed Career Facts into the
// presentation shape of a Resume. This module is PURE: no React, no Dexie,
// no AI, no clock, no randomness. Given the same facts and config it always
// produces identical output.
//
// Career Knowledge remains canonical. Nothing here writes a fact, changes a
// verification state, or writes back from a Resume into Career Knowledge.

import type { Award, Education, Project, ResumeData, Skill, Work } from '@/types/resume';
import type {
  CareerFact,
  CareerFactCategory,
  ProjectionAttribution,
} from '@/types/careerKnowledge';
import { withResumeDefaults } from '@/lib/resumeDefaults';

/** A projected Work entry, attributed back to the fact it came from. */
export type ProjectedWork = Work & { derivedFromFactIds: string[] };
/** A projected Project entry, attributed back to the fact it came from. */
export type ProjectedProject = Project & { derivedFromFactIds: string[] };
/** A projected Skill entry, attributed back to the fact it came from. */
export type ProjectedSkill = Skill & { derivedFromFactIds: string[] };
/** A projected Education entry, attributed back to the fact it came from. */
export type ProjectedEducation = Education & { derivedFromFactIds: string[] };
/** A projected Award entry, attributed back to the fact it came from. */
export type ProjectedAward = Award & { derivedFromFactIds: string[] };

export interface ProjectionConfig {
  profileId: string;
  /** Restrict projection to a subset of categories. Defaults to all projectable ones. */
  includeCategories?: CareerFactCategory[];
  /** Optional Resume whose non-projected fields seed the projection result. */
  baseResume?: ResumeData;
}

export type { ProjectionAttribution } from '@/types/careerKnowledge';

export type ProjectionSkipReason =
  | 'unverified'
  | 'superseded'
  | 'unmapped-category'
  | 'profile-mismatch';

export interface ProjectionSkip {
  factId: string;
  reason: ProjectionSkipReason;
}

export interface ProjectionResult {
  resumeData: ResumeData;
  attributions: ProjectionAttribution[];
  skipped: ProjectionSkip[];
}

type ProjectableEntity =
  | ProjectedWork
  | ProjectedProject
  | ProjectedSkill
  | ProjectedEducation
  | ProjectedAward;

type ProjectableCategory = 'experience' | 'education' | 'skill' | 'project' | 'achievement';

type ProjectableFact = CareerFact & { category: ProjectableCategory };

/**
 * Sections a projection owns and replaces wholesale. Everything else in a
 * Resume is Resume-local and preserved. `certification`, `preference`, and
 * `goal` have no Resume home — they are never projected.
 */
const PROJECTION_OWNED_SECTIONS: Record<CareerFactCategory, string | null> = {
  experience: 'work',
  education: 'education',
  skill: 'skills',
  project: 'projects',
  achievement: 'awards',
  certification: null,
  preference: null,
  goal: null,
};

/** Deterministic category emission order. */
const CATEGORY_ORDER: ProjectableCategory[] = [
  'experience',
  'education',
  'skill',
  'project',
  'achievement',
];

/**
 * A fact may be projected only when it belongs to this profile, is explicitly
 * confirmed by the user, has not been superseded, and maps to a Resume section.
 */
export function isFactProjectable(fact: CareerFact, profileId: string): boolean {
  return (
    fact.profileId === profileId &&
    fact.verificationState === 'confirmed' &&
    !fact.supersededBy &&
    PROJECTION_OWNED_SECTIONS[fact.category] !== null
  );
}

/** Reads a `structured` key as a non-empty string, else undefined. Never invents. */
function structuredString(
  structured: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = structured?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** Reads a `structured` key as a non-empty array of non-empty strings, else undefined. */
function structuredStringList(
  structured: Record<string, unknown> | undefined,
  key: string
): string[] | undefined {
  const value = structured?.[key];
  if (!Array.isArray(value)) return undefined;
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  );
  return items.length > 0 ? items : undefined;
}

/** Deterministic ordering within a category: lowercase subject, then fact id. */
function bySubjectThenId(a: CareerFact, b: CareerFact): number {
  const bySubject = a.subject.toLowerCase().localeCompare(b.subject.toLowerCase());
  return bySubject !== 0 ? bySubject : a.id.localeCompare(b.id);
}

function projectSkill(fact: CareerFact): ProjectedSkill {
  const { structured } = fact;
  const level = structuredString(structured, 'level');
  const keywords = structuredStringList(structured, 'keywords');
  return {
    name:
      structuredString(structured, 'skill') ??
      structuredString(structured, 'name') ??
      (fact.subject || fact.claim),
    ...(level ? { level } : {}),
    ...(keywords ? { keywords: [...keywords] } : {}),
    derivedFromFactIds: [fact.id],
  };
}

function projectWork(fact: CareerFact): ProjectedWork {
  const { structured } = fact;
  const startDate =
    structuredString(structured, 'startDate') ?? structuredString(structured, 'start');
  const endDate = structuredString(structured, 'endDate') ?? structuredString(structured, 'end');
  return {
    name: structuredString(structured, 'company') ?? fact.subject,
    position: structuredString(structured, 'role') ?? '',
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    summary: fact.claim,
    derivedFromFactIds: [fact.id],
  };
}

function projectProject(fact: CareerFact): ProjectedProject {
  const { structured } = fact;
  const keywords = structuredStringList(structured, 'keywords');
  return {
    name: structuredString(structured, 'project') ?? fact.subject,
    description: structuredString(structured, 'description') ?? fact.claim,
    ...(keywords ? { keywords: [...keywords] } : {}),
    derivedFromFactIds: [fact.id],
  };
}

function projectEducation(fact: CareerFact): ProjectedEducation {
  const { structured } = fact;
  const startDate =
    structuredString(structured, 'startDate') ?? structuredString(structured, 'start');
  const endDate = structuredString(structured, 'endDate') ?? structuredString(structured, 'end');
  return {
    institution: structuredString(structured, 'institution') ?? fact.subject,
    studyType:
      structuredString(structured, 'studyType') ?? structuredString(structured, 'degree') ?? '',
    area: structuredString(structured, 'area') ?? structuredString(structured, 'major') ?? '',
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    derivedFromFactIds: [fact.id],
  };
}

function projectAward(fact: CareerFact): ProjectedAward {
  const { structured } = fact;
  const awarder = structuredString(structured, 'awarder');
  const date = structuredString(structured, 'date');
  const title = fact.subject || fact.claim;
  // A summary is carried only when it says more than the title already does.
  const summary = fact.claim !== title ? fact.claim : undefined;
  return {
    title,
    ...(awarder ? { awarder } : {}),
    ...(date ? { date } : {}),
    ...(summary ? { summary } : {}),
    derivedFromFactIds: [fact.id],
  };
}

function projectFact(fact: ProjectableFact): ProjectableEntity {
  switch (fact.category) {
    case 'experience':
      return projectWork(fact);
    case 'project':
      return projectProject(fact);
    case 'skill':
      return projectSkill(fact);
    case 'education':
      return projectEducation(fact);
    case 'achievement':
      return projectAward(fact);
  }
}

/**
 * Projects confirmed Career Facts into a ResumeData-shaped projection.
 *
 * Each category maps onto one Resume section. One fact yields exactly one
 * entity — facts are never fuzzy-merged, so every entity carries a
 * single-element `derivedFromFactIds`.
 */
export function projectCareerKnowledgeToResume(
  facts: CareerFact[],
  config: ProjectionConfig
): ProjectionResult {
  const { profileId, includeCategories } = config;
  const sectionByCategory: Partial<Record<CareerFactCategory, string>> = {};
  for (const category of includeCategories ?? CATEGORY_ORDER) {
    const section = PROJECTION_OWNED_SECTIONS[category];
    if (section) sectionByCategory[category] = section;
  }

  const skipped: ProjectionSkip[] = [];
  const projectable: Array<{ fact: ProjectableFact; section: string }> = [];

  for (const fact of facts) {
    if (fact.profileId !== profileId) {
      skipped.push({ factId: fact.id, reason: 'profile-mismatch' });
      continue;
    }
    if (fact.supersededBy) {
      skipped.push({ factId: fact.id, reason: 'superseded' });
      continue;
    }
    if (fact.verificationState !== 'confirmed') {
      skipped.push({ factId: fact.id, reason: 'unverified' });
      continue;
    }
    const section = sectionByCategory[fact.category as ProjectableCategory];
    if (!section) {
      skipped.push({ factId: fact.id, reason: 'unmapped-category' });
      continue;
    }
    projectable.push({ fact: fact as ProjectableFact, section });
  }

  // Deterministic: category order first, then subject/id within a category, so
  // attribution indexes describe the emitted arrays.
  const sorted = [...projectable].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.fact.category) - CATEGORY_ORDER.indexOf(b.fact.category) ||
      bySubjectThenId(a.fact, b.fact)
  );

  const sections: Record<string, ProjectableEntity[]> = {
    work: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
  };
  const attributions: ProjectionAttribution[] = [];
  for (const { fact, section } of sorted) {
    const entities = sections[section];
    entities.push(projectFact(fact));
    attributions.push({ factId: fact.id, section, index: entities.length - 1 });
  }

  const resumeData: ResumeData = withResumeDefaults({
    ...(config.baseResume ?? {}),
    basics: config.baseResume?.basics ?? { name: '', email: '', label: '', summary: '' },
    work: sections.work as Work[],
    education: sections.education as Education[],
    skills: sections.skills as Skill[],
    projects: sections.projects as Project[],
    awards: sections.awards as Award[],
  });

  return { resumeData, attributions, skipped };
}

/**
 * Returns `base` with ONLY the projection-owned sections replaced by the
 * projected arrays. Every Resume-local field (basics, volunteer,
 * publications, languages, interests, references, meta, language) is carried
 * through untouched, as is the ordering of the remaining fields. Inputs are
 * never mutated.
 */
export function refreshResumeWithProjection(
  base: ResumeData,
  projection: ProjectionResult
): ResumeData {
  return withResumeDefaults({
    ...base,
    work: projection.resumeData.work.map((entry) => ({ ...entry })),
    education: projection.resumeData.education.map((entry) => ({ ...entry })),
    skills: projection.resumeData.skills.map((entry) => ({ ...entry })),
    projects: projection.resumeData.projects.map((entry) => ({ ...entry })),
    awards: (projection.resumeData.awards ?? []).map((entry) => ({ ...entry })),
  });
}

export interface ProjectedResumeRow {
  createdAt: number;
  fileName: string;
  rawText: string;
  parsedData: ResumeData;
}

/**
 * Builds a persistable Resume row from a projection. Does NOT touch the
 * database — the caller persists it via `db.resumes.add`; Dexie compression of
 * `parsedData` happens in the database hooks, not here.
 */
export function createProjectedResumeRow(
  profileId: string,
  facts: CareerFact[],
  base?: ResumeData
): ProjectedResumeRow {
  const projection = projectCareerKnowledgeToResume(facts, {
    profileId,
    ...(base ? { baseResume: base } : {}),
  });
  const parsedData = base ? refreshResumeWithProjection(base, projection) : projection.resumeData;
  return {
    createdAt: Date.now(),
    fileName: 'career-knowledge-projection.json',
    rawText: JSON.stringify(parsedData),
    parsedData,
  };
}
