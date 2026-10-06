// Career Knowledge Migration Fixtures & Test Data (Phase 14).
//
// Provides synthetic historical, corrupted, and edge-case datasets to verify:
//   * Schema version upgrades (v0 -> v1)
//   * Future incompatible version rejection
//   * Corruption detection & containment
//   * Supersession cycles & self-referential links
//   * Cross-profile leakage prevention

import type {
  CareerEvidence,
  CareerFact,
  CareerFactCategory,
  CareerNote,
  CareerProfile,
  FactEvidenceLink,
  FactOrigin,
  VerificationState,
} from '@/types/careerKnowledge';

export const MIGRATION_PROFILE_ID = 'prof-migration-test-001';
export const FOREIGN_PROFILE_ID = 'prof-foreign-test-999';

/**
 * Valid V1 standard dataset fixture containing all 4 verification states,
 * multiple evidence sources, superseded facts, notes, and links.
 */
export const VALID_V1_FIXTURE: {
  profile: CareerProfile;
  facts: CareerFact[];
  evidence: CareerEvidence[];
  links: FactEvidenceLink[];
  notes: CareerNote[];
} = {
  profile: {
    id: MIGRATION_PROFILE_ID,
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  facts: [
    {
      id: 'fact-mig-1',
      profileId: MIGRATION_PROFILE_ID,
      category: 'skill',
      subject: 'TypeScript',
      claim: 'Proficient in TypeScript 5 with strict mode',
      structured: { skill: 'TypeScript', version: '5' },
      verificationState: 'confirmed',
      origin: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'fact-mig-2',
      profileId: MIGRATION_PROFILE_ID,
      category: 'experience',
      subject: 'Backend Engineer',
      claim: 'Backend Engineer at TechCorp (2022-2024)',
      structured: { role: 'Backend Engineer', company: 'TechCorp' },
      verificationState: 'needs_confirmation',
      origin: 'migration',
      supersededBy: 'fact-mig-3',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'fact-mig-3',
      profileId: MIGRATION_PROFILE_ID,
      category: 'experience',
      subject: 'Senior Backend Engineer',
      claim: 'Senior Backend Engineer at TechCorp (2022-2024)',
      structured: { role: 'Senior Backend Engineer', company: 'TechCorp' },
      verificationState: 'confirmed',
      origin: 'user',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'fact-mig-4',
      profileId: MIGRATION_PROFILE_ID,
      category: 'project',
      subject: 'OpenSource CLI',
      claim: 'Built CLI tool with 500 GitHub stars',
      structured: { project: 'OpenSource CLI' },
      verificationState: 'observed',
      origin: 'external',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'fact-mig-5',
      profileId: MIGRATION_PROFILE_ID,
      category: 'certification',
      subject: 'AWS Certified',
      claim: 'AWS Solutions Architect Associate (Expired)',
      verificationState: 'rejected',
      origin: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  evidence: [
    {
      id: 'ev-mig-1',
      profileId: MIGRATION_PROFILE_ID,
      sourceType: 'github',
      sourceRef: 'repo/cli-tool',
      excerpt: 'Stargazers count: 500',
      url: 'https://github.com/example/cli-tool',
      capturedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ev-mig-2',
      profileId: MIGRATION_PROFILE_ID,
      sourceType: 'uploaded_document',
      sourceRef: 'resume-2024.pdf',
      excerpt: 'Senior Backend Engineer at TechCorp',
      capturedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  links: [
    {
      factId: 'fact-mig-4',
      evidenceId: 'ev-mig-1',
      relation: 'supports',
    },
    {
      factId: 'fact-mig-3',
      evidenceId: 'ev-mig-2',
      relation: 'supports',
    },
  ],
  notes: [
    {
      id: 'note-mig-1',
      factId: 'fact-mig-1',
      scope: 'global',
      text: 'Verified TypeScript strictly used across all microservices',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

/**
 * Legacy V0 unmigrated dataset (lacks origin, has integer timestamps).
 */
export const LEGACY_V0_FACTS = [
  {
    id: 'legacy-fact-1',
    profileId: MIGRATION_PROFILE_ID,
    category: 'skill',
    subject: 'Node.js',
    claim: 'Node.js developer',
    verificationState: 'needs_confirmation',
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
];

/**
 * Incompatible future schema version fixture (e.g. schemaVersion 99).
 */
export const FUTURE_SCHEMA_FIXTURE = {
  profile: {
    id: MIGRATION_PROFILE_ID,
    schemaVersion: 99,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
  },
  facts: [],
  evidence: [],
  links: [],
  notes: [],
};

/**
 * Corrupted dataset with missing parent profile.
 */
export const CORRUPT_MISSING_PROFILE_FIXTURE = {
  facts: [
    {
      id: 'corrupt-fact-1',
      profileId: 'non-existent-profile-xyz',
      category: 'skill' as const,
      subject: 'Rust',
      claim: 'Rust developer',
      verificationState: 'confirmed' as const,
      origin: 'user' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

/**
 * Corrupted dataset with dangling evidence link.
 */
export const CORRUPT_DANGLING_LINK_FIXTURE = {
  profile: VALID_V1_FIXTURE.profile,
  facts: [VALID_V1_FIXTURE.facts[0]],
  evidence: [],
  links: [
    {
      factId: VALID_V1_FIXTURE.facts[0].id,
      evidenceId: 'missing-evidence-999',
      relation: 'supports' as const,
    },
  ],
  notes: [],
};

/**
 * Corrupted dataset with cross-profile link.
 */
export const CORRUPT_CROSS_PROFILE_FIXTURE = {
  profile: VALID_V1_FIXTURE.profile,
  facts: [VALID_V1_FIXTURE.facts[0]],
  evidence: [
    {
      id: 'foreign-ev-1',
      profileId: FOREIGN_PROFILE_ID,
      sourceType: 'github' as const,
      capturedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  links: [
    {
      factId: VALID_V1_FIXTURE.facts[0].id,
      evidenceId: 'foreign-ev-1',
      relation: 'supports' as const,
    },
  ],
  notes: [],
};

/**
 * Corrupted dataset with supersession cycle (A -> B -> A).
 */
export const CORRUPT_SUPERSESSION_CYCLE_FIXTURE = {
  profile: VALID_V1_FIXTURE.profile,
  facts: [
    {
      id: 'cycle-fact-a',
      profileId: MIGRATION_PROFILE_ID,
      category: 'skill' as const,
      subject: 'Python',
      claim: 'Python 2',
      verificationState: 'needs_confirmation' as const,
      origin: 'migration' as const,
      supersededBy: 'cycle-fact-b',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cycle-fact-b',
      profileId: MIGRATION_PROFILE_ID,
      category: 'skill' as const,
      subject: 'Python',
      claim: 'Python 3',
      verificationState: 'confirmed' as const,
      origin: 'user' as const,
      supersededBy: 'cycle-fact-a',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  evidence: [],
  links: [],
  notes: [],
};

/**
 * Legacy schema upgrade function: upgrades legacy raw records to current V1 schema.
 */
export function migrateLegacyToV1(rawFacts: Array<Record<string, unknown>>): CareerFact[] {
  return rawFacts.map((rf) => {
    return {
      id: String(rf.id),
      profileId: String(rf.profileId || MIGRATION_PROFILE_ID),
      category: (rf.category as CareerFactCategory) || 'skill',
      subject: String(rf.subject || rf.claim || 'Legacy Subject'),
      claim: String(rf.claim || rf.subject || 'Legacy Claim'),
      structured: rf.structured ? (rf.structured as Record<string, unknown>) : undefined,
      verificationState: (rf.verificationState as VerificationState) || 'needs_confirmation',
      origin: (rf.origin as FactOrigin) || 'migration',
      supersededBy: rf.supersededBy ? String(rf.supersededBy) : undefined,
      createdAt: typeof rf.createdAt === 'string' ? rf.createdAt : new Date().toISOString(),
      updatedAt: typeof rf.updatedAt === 'string' ? rf.updatedAt : new Date().toISOString(),
    };
  });
}
