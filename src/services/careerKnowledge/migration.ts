// Resume -> Career Knowledge migration/import (Phase 3).
//
// This is an explicit, deterministic migration: it inspects existing Resume
// records and creates CareerKnowledge candidates (verificationState =
// needs_confirmation). It does NOT:
//   * mutate or rewrite Resume records
//   * automatically confirm migrated facts
//   * synchronize Resume <-> Career Knowledge after the initial migration
//   * import ambiguous/unmappable content
//
// Dependency direction: this service -> repository -> domain/types -> Dexie.

import type {
  Actor,
  CareerEvidence,
  CareerFact,
  CareerFactCategory,
  FactEvidenceLink,
  VerificationState,
} from '@/types/careerKnowledge';
import type {
  CreateCareerFactInput,
  CreateCareerEvidenceInput,
  DomainContext as DomainContextType,
} from '@/services/careerKnowledge/careerKnowledge';
import { careerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import type { Resume } from '@/types/resume';

// ---------------------------------------------------------------------------
// Deterministic migration identity
// ---------------------------------------------------------------------------

/**
 * Build a stable, deterministic CareerFact id from a profile + Resume source
 * + section + item key. Same inputs always produce the same id, which makes
 * re-running the migration idempotent: `repository.getFact(id)` returns the
 * existing record and we skip creation.
 *
 * Format:
 *   resume:<profileId>:<resumeId>:<section>:<localKey>[:hash]
 *
 * profileId is included so the same Resume content migrated into two different
 * profiles produces separate fact records (profile isolation).
 */
export function buildResumeFactId(
  profileId: string,
  resumeId: string | number | undefined,
  section: string,
  localKey: string,
  hash?: string
): string {
  const rid = resumeId == null ? 'none' : String(resumeId);
  const safeSection = section.replace(/:/g, '_');
  const safeKey = localKey.replace(/:/g, '_');
  const id = `resume:${profileId}:${rid}:${safeSection}:${safeKey}`;
  if (hash) return `${id}:${hash}`;
  return id;
}

// ---------------------------------------------------------------------------
// Migration provenance helpers
// ---------------------------------------------------------------------------

function resumeSectionSourceRef(
  resumeId: string | number | undefined,
  section: string,
  index: number
): string {
  return `resume:${resumeId ?? 'none'}:${section}:${index}`;
}

function makeEvidenceInput(
  profileId: string,
  resumeId: string | number | undefined,
  section: string,
  index: number,
  excerpt?: string
): CreateCareerEvidenceInput {
  return {
    profileId,
    sourceType: 'other',
    sourceRef: resumeSectionSourceRef(resumeId, section, index),
    excerpt: excerpt ?? `Resume ${resumeId ?? 'unknown'} ${section}[${index}]`,
  };
}

// ---------------------------------------------------------------------------
// Skipped/unmappable fields reporting
// ---------------------------------------------------------------------------

export interface SkippedField {
  /** Resume section name, e.g. "basics.summary". */
  path: string;
  /** Why the field was deferred. */
  reason: string;
}

export interface MigratedFactRecord {
  /** Deterministic fact id (also serves as dedup key). */
  factId: string;
  category: CareerFactCategory;
  claim: string;
  /** Verification state after migration. */
  verificationState: VerificationState;
  /** Whether the fact was newly created in this run. */
  created: boolean;
}

export interface MigrationResult {
  /** Facts that were newly created during this run. */
  createdFacts: MigratedFactRecord[];
  /** Facts that already existed and were reused (idempotent). */
  reusedFacts: MigratedFactRecord[];
  /** Evidence records newly created. */
  createdEvidence: CareerEvidence[];
  /** Fact<->Evidence links newly created. */
  createdLinks: FactEvidenceLink[];
  /** Fields that could not be deterministically mapped. */
  skipped: SkippedField[];
}

// ---------------------------------------------------------------------------
// Single-fact migration helper
// ---------------------------------------------------------------------------

async function migrateFact(
  profileId: string,
  resumeId: string | number | undefined,
  section: string,
  index: number,
  input: CreateCareerFactInput,
  deterministicId: string,
  evidenceExcerpt?: string
): Promise<{
  record: MigratedFactRecord;
  evidence: CareerEvidence;
  link: FactEvidenceLink;
} | null> {
  // Idempotency: if this exact deterministic id already exists, reuse it.
  const existing = await careerKnowledgeRepository.getFact(deterministicId);
  if (existing) {
    return {
      record: {
        factId: existing.id,
        category: existing.category,
        claim: existing.claim,
        verificationState: existing.verificationState,
        created: false,
      },
      evidence: (await careerKnowledgeRepository.listEvidenceForFact(existing.id))[0],
      link: (await careerKnowledgeRepository.listLinksForFact(existing.id))[0],
    };
  }

  // New fact (always needs_confirmation for migrated content).
  const factInput: CreateCareerFactInput = {
    ...input,
    verificationState: 'needs_confirmation',
    origin: 'migration',
  };

  const factCtx: DomainContextType = { id: () => deterministicId };
  const fact = await careerKnowledgeRepository.createFact(
    { ...factInput, origin: 'migration' },
    factCtx
  );

  const deterministicEvidenceId = `${deterministicId}:evidence`;
  const evidenceCtx: DomainContextType = { id: () => deterministicEvidenceId };
  const evidenceInput = makeEvidenceInput(profileId, resumeId, section, index, evidenceExcerpt);
  const evidence = await careerKnowledgeRepository.createEvidence(evidenceInput, evidenceCtx);

  const link = await careerKnowledgeRepository.linkEvidenceToFact(fact.id, evidence.id, 'supports');

  return {
    record: {
      factId: fact.id,
      category: fact.category,
      claim: fact.claim,
      verificationState: fact.verificationState,
      created: true,
    },
    evidence,
    link,
  };
}

// ---------------------------------------------------------------------------
// Preview-only path (no persistence)
// ---------------------------------------------------------------------------

export interface PreviewFact extends MigratedFactRecord {
  section: string;
  index: number;
  structured?: Record<string, unknown>;
  evidenceExcerpt: string;
}

export interface MigrationPreview {
  facts: PreviewFact[];
  skipped: SkippedField[];
}

/**
 * Deterministically derive what a migration would produce, without writing
 * anything. Useful for tests and future UI.
 */
export function previewResumeMigration(
  resume: Resume,
  profileId: string,
  resumeId?: string | number
): MigrationPreview {
  const rid = resumeId ?? resume.id;
  const data = resume.parsedData;
  if (!data)
    return {
      facts: [],
      skipped: [{ path: 'parsedData', reason: 'No structured Resume data to migrate.' }],
    };

  const facts: PreviewFact[] = [];
  const skipped: SkippedField[] = [];

  const add = (
    section: string,
    idx: number,
    category: CareerFactCategory,
    claim: string,
    structured?: Record<string, unknown>,
    excerpt?: string
  ) => {
    const localKey = `${data.basics?.name ?? 'unknown'}_${idx}`;
    const id = buildResumeFactId(profileId, rid, section, localKey);
    facts.push({
      factId: id,
      category,
      claim,
      verificationState: 'needs_confirmation',
      created: true,
      section,
      index: idx,
      structured,
      evidenceExcerpt: excerpt ?? `Resume ${rid ?? 'unknown'} ${section}[${idx}]`,
    });
  };

  // skills
  (data.skills ?? []).forEach((s, i: number) => {
    if (s.name?.trim()) {
      add(
        'skills',
        i,
        'skill',
        s.name.trim(),
        s.keywords?.length ? { keywords: s.keywords } : undefined
      );
    } else {
      skipped.push({ path: `skills[${i}].name`, reason: 'Empty skill name.' });
    }
  });

  // work
  (data.work ?? []).forEach((w, i: number) => {
    const company = w.name?.trim();
    const position = w.position?.trim();
    if (!company && !position) {
      skipped.push({ path: `work[${i}]`, reason: 'Missing company and position.' });
      return;
    }
    const claim =
      [position, company, w.startDate, w.endDate].filter(Boolean).join(' at ') ||
      `${company ?? position}`;
    add('work', i, 'experience', claim, {
      company: w.name ?? undefined,
      role: w.position ?? undefined,
      start: w.startDate,
      end: w.endDate,
    });
  });

  // education
  (data.education ?? []).forEach((e, i: number) => {
    const institution = e.institution?.trim();
    const studyType = e.studyType?.trim();
    if (!institution && !studyType) {
      skipped.push({ path: `education[${i}]`, reason: 'Missing institution and studyType.' });
      return;
    }
    const claim =
      [studyType, institution, e.startDate, e.endDate].filter(Boolean).join(' at ') ||
      `${institution}`;
    add('education', i, 'education', claim, {
      institution: e.institution ?? undefined,
      studyType: e.studyType ?? undefined,
      area: e.area ?? undefined,
      start: e.startDate,
      end: e.endDate,
    });
  });

  // projects
  (data.projects ?? []).forEach((p, i: number) => {
    const name = p.name?.trim();
    if (!name) {
      skipped.push({ path: `projects[${i}].name`, reason: 'Missing project name.' });
      return;
    }
    const claim = p.description?.trim() || name;
    add('projects', i, 'project', `${name}: ${claim}`, {
      project: name,
      description: p.description ?? undefined,
      keywords: p.keywords ?? undefined,
    });
  });

  // awards
  (data.awards ?? []).forEach((a, i: number) => {
    const title = a.title?.trim();
    if (!title) {
      skipped.push({ path: `awards[${i}].title`, reason: 'Missing award title.' });
      return;
    }
    add('awards', i, 'achievement', title, {
      awarder: a.awarder ?? undefined,
      date: a.date ?? undefined,
    });
  });

  // Deferred (intentionally not mapped):
  // - basics.summary: free-text synthesis, not a single atomic claim.
  // - basics (name/email/phone/url/address): identity/contact, not a career claim.
  // - volunteer: semantically similar to work but separate JSON Resume section;
  //   deferred until the project explicitly adds a category or merges it.
  // - publications: not a career claim in the current taxonomy.
  // - languages, interests, references: not career claims.
  // - meta (template, styles): presentation metadata.
  if (data.basics?.summary?.trim()) {
    skipped.push({
      path: 'basics.summary',
      reason: 'Free-text summary; deferred to manual review.',
    });
  }

  return { facts, skipped };
}

// ---------------------------------------------------------------------------
// Apply migration (idempotent, transactional per resume)
// ---------------------------------------------------------------------------

/**
 * Migrate a Resume's structured content into Career Knowledge candidates.
 *
 * Requirements:
 *   - `resume.parsedData` must exist; otherwise returns an empty result with
 *     a skipped field explaining why.
 *   - `profileId` must be provided; migration does not invent a profile.
 *
 * Returns a structured result reporting created/reused facts, evidence, links,
 * and skipped fields.
 */
export async function migrateResumeToCareerKnowledge(
  resume: Resume,
  profileId: string
): Promise<MigrationResult> {
  const preview = previewResumeMigration(resume, profileId, resume.id);

  const createdFacts: MigratedFactRecord[] = [];
  const reusedFacts: MigratedFactRecord[] = [];
  const createdEvidence: CareerEvidence[] = [];
  const createdLinks: FactEvidenceLink[] = [];

  await careerKnowledgeRepository.transaction('rw', async () => {
    for (const pf of preview.facts) {
      const deterministicId = pf.factId;
      const existing = await careerKnowledgeRepository.getFact(deterministicId);
      if (existing) {
        reusedFacts.push({
          factId: existing.id,
          category: existing.category,
          claim: existing.claim,
          verificationState: existing.verificationState,
          created: false,
        });
        continue;
      }

      const result = await migrateFact(
        profileId,
        resume.id,
        pf.section,
        pf.index,
        {
          profileId,
          category: pf.category,
          subject: pf.claim,
          claim: pf.claim,
          structured: pf.structured,
          origin: 'migration',
        },
        deterministicId,
        pf.evidenceExcerpt
      );

      if (!result) continue;
      if (result.record.created) {
        createdFacts.push(result.record);
        createdEvidence.push(result.evidence);
        createdLinks.push(result.link);
      } else {
        reusedFacts.push(result.record);
      }
    }
  });

  return {
    createdFacts,
    reusedFacts,
    createdEvidence,
    createdLinks,
    skipped: preview.skipped,
  };
}

// ---------------------------------------------------------------------------
// Explicit confirmation workflow (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Confirm a migrated candidate. This is a domain-state transition and is
 * user-only enforced by the Phase 1 domain layer.
 */
export async function confirmMigratedCandidate(
  factId: string,
  actor: Actor = 'user'
): Promise<CareerFact> {
  return careerKnowledgeRepository.confirmFact(factId, actor);
}

/**
 * Reject a migrated candidate. This is a domain-state transition and is
 * user-only enforced by the Phase 1 domain layer.
 */
export async function rejectMigratedCandidate(
  factId: string,
  actor: Actor = 'user'
): Promise<CareerFact> {
  return careerKnowledgeRepository.rejectFact(factId, actor);
}

/**
 * Move a confirmed fact back to needs_confirmation for re-review. User-only.
 */
export async function invalidateMigratedCandidate(
  factId: string,
  actor: Actor = 'user'
): Promise<CareerFact> {
  return careerKnowledgeRepository.invalidateFact(factId, actor);
}
