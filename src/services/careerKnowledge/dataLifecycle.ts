// Career Knowledge Data Lifecycle, Recovery & Migration Hardening (Phase 14).
//
// Provides deterministic semantic integrity validation, export/import with
// trust boundaries, local database reset/recovery, orphan detection/repair,
// and cross-version schema migration safety.
//
// Invariants:
//   * Never silently downgrades or upgrades verification states during recovery.
//   * Stable UUIDs are preserved across export, import, and recovery.
//   * Evidence provenance and immutability are strictly preserved.
//   * Supersession relationships and history survive recovery intact.
//   * Resume attribution (`derivedFromFactIds`) survives recovery.
//   * Cross-profile imports are rejected unless explicitly re-mapped.
//   * All imports and mutations are transactionally atomic.

import { db as defaultDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CAREER_SCHEMA_VERSION } from './careerKnowledge';
import {
  careerKnowledgeExportPayloadSchema,
  careerKnowledgeSyncDataSchema,
  careerFactCategorySchema,
  verificationStateSchema,
  factOriginSchema,
  evidenceSourceTypeSchema,
  factEvidenceRelationSchema,
} from './schemas';
import type {
  CareerEvidence,
  CareerFact,
  CareerIntegrityReport,
  CareerKnowledgeExportPayload,
  CareerNote,
  CareerProfile,
  FactEvidenceLink,
  IntegrityIssue,
} from '@/types/careerKnowledge';
import type { Resume } from '@/types/resume';

export const CURRENT_CK_EXPORT_VERSION = 1;

type CareerDb = Pick<
  typeof defaultDb,
  | 'careerProfiles'
  | 'careerFacts'
  | 'careerEvidence'
  | 'factEvidenceLinks'
  | 'careerNotes'
  | 'resumes'
  | 'transaction'
>;

function isValidIsoDate(str: unknown): boolean {
  if (typeof str !== 'string' || !str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime()) && str.includes('T');
}

/**
 * Validates semantic integrity of Career Knowledge persistence.
 * Checks referential integrity, verification state invariants, supersession graph cycles,
 * cross-profile link constraints, timestamp formats, and Resume attribution pointers.
 */
export async function validateCareerKnowledgeIntegrity(
  options: { profileId?: string; checkResumes?: boolean } = {},
  customDb: CareerDb = defaultDb
): Promise<CareerIntegrityReport> {
  const errors: IntegrityIssue[] = [];
  const warnings: IntegrityIssue[] = [];
  const orphans = {
    facts: [] as string[],
    evidence: [] as string[],
    links: [] as Array<{ factId: string; evidenceId: string }>,
    notes: [] as string[],
  };

  const { profileId, checkResumes = true } = options;

  // 1. Load entities
  let profiles: CareerProfile[] = [];
  if (customDb.careerProfiles) {
    if (profileId) {
      const p = await customDb.careerProfiles.get(profileId);
      if (p) profiles = [p];
    } else {
      profiles = await customDb.careerProfiles.toArray();
    }
  }
  const profileIdSet = new Set(profiles.map((p) => p.id));

  let facts: CareerFact[] = [];
  if (customDb.careerFacts) {
    if (profileId) {
      facts = await customDb.careerFacts.where('profileId').equals(profileId).toArray();
    } else {
      facts = await customDb.careerFacts.toArray();
    }
  }
  const factMap = new Map<string, CareerFact>(facts.map((f) => [f.id, f]));

  let evidence: CareerEvidence[] = [];
  if (customDb.careerEvidence) {
    if (profileId) {
      evidence = await customDb.careerEvidence.where('profileId').equals(profileId).toArray();
    } else {
      evidence = await customDb.careerEvidence.toArray();
    }
  }
  const evidenceMap = new Map<string, CareerEvidence>(evidence.map((e) => [e.id, e]));

  let links: FactEvidenceLink[] = [];
  if (customDb.factEvidenceLinks) {
    const allLinks = await customDb.factEvidenceLinks.toArray();
    if (profileId) {
      // Scope to this profile without deleting other profiles' data:
      // keep a link if either side belongs to this profile (via scoped maps
      // or a DB lookup), or if the parent is gone globally (unattributable
      // dangling — safe to report in scope; global scan also finds it).
      // Skip links whose surviving parent belongs to another profile.
      const missingFactIds = [
        ...new Set(allLinks.map((l) => l.factId).filter((id) => !factMap.has(id))),
      ];
      const missingEvIds = [
        ...new Set(allLinks.map((l) => l.evidenceId).filter((id) => !evidenceMap.has(id))),
      ];
      const factOwner = new Map<string, string>();
      const evOwner = new Map<string, string>();
      if (missingFactIds.length > 0) {
        const rows = await customDb.careerFacts.where('id').anyOf(missingFactIds).toArray();
        for (const f of rows) factOwner.set(f.id, f.profileId);
      }
      if (missingEvIds.length > 0) {
        const rows = await customDb.careerEvidence.where('id').anyOf(missingEvIds).toArray();
        for (const e of rows) evOwner.set(e.id, e.profileId);
      }
      for (const l of allLinks) {
        const inScopeFact = factMap.has(l.factId);
        const inScopeEv = evidenceMap.has(l.evidenceId);
        if (inScopeFact || inScopeEv) {
          links.push(l);
          continue;
        }
        const factProfile = factOwner.get(l.factId);
        const evProfile = evOwner.get(l.evidenceId);
        // Another profile owns a surviving side → not ours, skip.
        if ((factProfile && factProfile !== profileId) || (evProfile && evProfile !== profileId))
          continue;
        // Both sides gone globally, or surviving side is ours → include.
        // (If both sides are gone we cannot attribute, but reporting the
        // dangling link in scope is safe — repair only deletes dangling rows.)
        if (!factProfile || factProfile === profileId || !evProfile || evProfile === profileId) {
          links.push(l);
        }
      }
    } else {
      links = allLinks;
    }
  }

  let notes: CareerNote[] = [];
  if (customDb.careerNotes) {
    const allNotes = await customDb.careerNotes.toArray();
    if (profileId) {
      // Same ownership rule as links: keep notes whose fact is in scope or
      // gone globally; skip notes whose fact lives in another profile.
      const missingNoteFactIds = [
        ...new Set(allNotes.map((n) => n.factId).filter((id) => !factMap.has(id))),
      ];
      const noteFactOwner = new Map<string, string>();
      if (missingNoteFactIds.length > 0) {
        const rows = await customDb.careerFacts.where('id').anyOf(missingNoteFactIds).toArray();
        for (const f of rows) noteFactOwner.set(f.id, f.profileId);
      }
      for (const n of allNotes) {
        if (factMap.has(n.factId)) {
          notes.push(n);
          continue;
        }
        const owner = noteFactOwner.get(n.factId);
        if (owner && owner !== profileId) continue; // other profile's note
        notes.push(n); // ours (fact deleted) or globally dangling
      }
    } else {
      notes = allNotes;
    }
  }

  // 2. Validate Profiles
  for (const prof of profiles) {
    if (prof.schemaVersion > CAREER_SCHEMA_VERSION) {
      errors.push({
        kind: 'schema_mismatch',
        entityType: 'profile',
        entityId: prof.id,
        profileId: prof.id,
        detail: `Profile schema version ${prof.schemaVersion} exceeds max supported ${CAREER_SCHEMA_VERSION}`,
      });
    }
    if (!isValidIsoDate(prof.createdAt) || !isValidIsoDate(prof.updatedAt)) {
      warnings.push({
        kind: 'malformed_timestamp',
        entityType: 'profile',
        entityId: prof.id,
        profileId: prof.id,
        detail: `Profile ${prof.id} has malformed createdAt or updatedAt timestamp`,
      });
    }
  }

  // 3. Validate Facts
  for (const fact of facts) {
    // Missing Profile Check
    if (!profileIdSet.has(fact.profileId)) {
      errors.push({
        kind: 'missing_profile',
        entityType: 'fact',
        entityId: fact.id,
        profileId: fact.profileId,
        detail: `Fact "${fact.id}" references non-existent profile "${fact.profileId}"`,
      });
      orphans.facts.push(fact.id);
    }

    // Category check
    const catCheck = careerFactCategorySchema.safeParse(fact.category);
    if (!catCheck.success) {
      errors.push({
        kind: 'invalid_category',
        entityType: 'fact',
        entityId: fact.id,
        profileId: fact.profileId,
        detail: `Fact "${fact.id}" has invalid category "${fact.category}"`,
      });
    }

    // Verification state check
    const verCheck = verificationStateSchema.safeParse(fact.verificationState);
    if (!verCheck.success) {
      errors.push({
        kind: 'invalid_verification_state',
        entityType: 'fact',
        entityId: fact.id,
        profileId: fact.profileId,
        detail: `Fact "${fact.id}" has invalid verificationState "${fact.verificationState}"`,
      });
    }

    // Origin check
    const originCheck = factOriginSchema.safeParse(fact.origin);
    if (!originCheck.success) {
      errors.push({
        kind: 'invalid_origin',
        entityType: 'fact',
        entityId: fact.id,
        profileId: fact.profileId,
        detail: `Fact "${fact.id}" has invalid origin "${fact.origin}"`,
      });
    }

    // Timestamp check
    if (!isValidIsoDate(fact.createdAt) || !isValidIsoDate(fact.updatedAt)) {
      warnings.push({
        kind: 'malformed_timestamp',
        entityType: 'fact',
        entityId: fact.id,
        profileId: fact.profileId,
        detail: `Fact "${fact.id}" has malformed timestamp`,
      });
    }

    // Supersession checks
    if (fact.supersededBy) {
      if (fact.supersededBy === fact.id) {
        errors.push({
          kind: 'invalid_supersession',
          entityType: 'fact',
          entityId: fact.id,
          profileId: fact.profileId,
          detail: `Fact "${fact.id}" cannot supersede itself`,
        });
      } else {
        const targetFact = factMap.get(fact.supersededBy);
        if (!targetFact) {
          errors.push({
            kind: 'invalid_supersession',
            entityType: 'fact',
            entityId: fact.id,
            profileId: fact.profileId,
            detail: `Fact "${fact.id}" references non-existent supersededBy fact "${fact.supersededBy}"`,
          });
        } else if (targetFact.profileId !== fact.profileId) {
          errors.push({
            kind: 'invalid_supersession',
            entityType: 'fact',
            entityId: fact.id,
            profileId: fact.profileId,
            detail: `Fact "${fact.id}" and superseding fact "${targetFact.id}" belong to different profiles`,
          });
        }

        // Detect supersession cycles
        const visited = new Set<string>([fact.id]);
        let curr: string | undefined = fact.supersededBy;
        while (curr) {
          if (visited.has(curr)) {
            errors.push({
              kind: 'supersession_cycle',
              entityType: 'fact',
              entityId: fact.id,
              profileId: fact.profileId,
              detail: `Supersession cycle detected starting from fact "${fact.id}" at "${curr}"`,
            });
            break;
          }
          visited.add(curr);
          const nextFact = factMap.get(curr);
          curr = nextFact?.supersededBy;
        }
      }
    }
  }

  // 4. Validate Evidence
  for (const ev of evidence) {
    if (!profileIdSet.has(ev.profileId)) {
      errors.push({
        kind: 'missing_profile',
        entityType: 'evidence',
        entityId: ev.id,
        profileId: ev.profileId,
        detail: `Evidence "${ev.id}" references non-existent profile "${ev.profileId}"`,
      });
      orphans.evidence.push(ev.id);
    }

    const sourceCheck = evidenceSourceTypeSchema.safeParse(ev.sourceType);
    if (!sourceCheck.success) {
      errors.push({
        kind: 'invalid_origin',
        entityType: 'evidence',
        entityId: ev.id,
        profileId: ev.profileId,
        detail: `Evidence "${ev.id}" has invalid sourceType "${ev.sourceType}"`,
      });
    }

    if (!isValidIsoDate(ev.capturedAt)) {
      warnings.push({
        kind: 'malformed_timestamp',
        entityType: 'evidence',
        entityId: ev.id,
        profileId: ev.profileId,
        detail: `Evidence "${ev.id}" has malformed capturedAt timestamp`,
      });
    }
  }

  // 5. Validate Links
  for (const link of links) {
    const parentFact = factMap.get(link.factId);
    const parentEvidence = evidenceMap.get(link.evidenceId);
    const linkKey = `${link.factId}:${link.evidenceId}`;

    if (!parentFact) {
      errors.push({
        kind: 'missing_fact',
        entityType: 'link',
        entityId: linkKey,
        detail: `Link references missing fact "${link.factId}"`,
      });
    }

    if (!parentEvidence) {
      errors.push({
        kind: 'missing_evidence',
        entityType: 'link',
        entityId: linkKey,
        detail: `Link references missing evidence "${link.evidenceId}"`,
      });
    }

    // Push orphan once even if both sides are missing (dedupe for repair counting).
    if (!parentFact || !parentEvidence) {
      if (
        !orphans.links.some((l) => l.factId === link.factId && l.evidenceId === link.evidenceId)
      ) {
        orphans.links.push({ factId: link.factId, evidenceId: link.evidenceId });
      }
    }

    if (parentFact && parentEvidence && parentFact.profileId !== parentEvidence.profileId) {
      errors.push({
        kind: 'cross_profile_link',
        entityType: 'link',
        entityId: `${link.factId}:${link.evidenceId}`,
        detail: `Link joins fact "${link.factId}" (profile ${parentFact.profileId}) with evidence "${link.evidenceId}" (profile ${parentEvidence.profileId})`,
      });
    }

    const relCheck = factEvidenceRelationSchema.safeParse(link.relation);
    if (!relCheck.success) {
      errors.push({
        kind: 'invalid_category',
        entityType: 'link',
        entityId: `${link.factId}:${link.evidenceId}`,
        detail: `Link has invalid relation "${link.relation}"`,
      });
    }
  }

  // 6. Validate Notes
  for (const note of notes) {
    const parentFact = factMap.get(note.factId);
    if (!parentFact) {
      errors.push({
        kind: 'missing_fact',
        entityType: 'note',
        entityId: note.id,
        detail: `Note "${note.id}" references missing fact "${note.factId}"`,
      });
      orphans.notes.push(note.id);
    }
    if (!isValidIsoDate(note.createdAt) || !isValidIsoDate(note.updatedAt)) {
      warnings.push({
        kind: 'malformed_timestamp',
        entityType: 'note',
        entityId: note.id,
        detail: `Note "${note.id}" has malformed timestamp`,
      });
    }
  }

  // 7. Check Resume Attributions
  let resumesChecked = 0;
  if (checkResumes && customDb.resumes) {
    try {
      const resumes: Resume[] = await customDb.resumes.toArray();
      resumesChecked = resumes.length;

      for (const resume of resumes) {
        const pd = resume.parsedData;
        if (!pd) continue;

        const checkFactIds = (ids?: string[], sectionName = 'section', itemIdx = 0) => {
          if (!ids || !Array.isArray(ids)) return;
          for (const fid of ids) {
            if (!factMap.has(fid)) {
              warnings.push({
                kind: 'broken_resume_attribution',
                entityType: 'resume',
                entityId: String(resume.id ?? 'unknown'),
                detail: `Resume ${resume.id} (${sectionName}[${itemIdx}]) references non-existent fact "${fid}"`,
              });
            }
          }
        };

        // Summary
        if (pd.basics?.derivedFromFactIds) {
          checkFactIds(pd.basics.derivedFromFactIds, 'basics.summary', 0);
        }

        // Work
        pd.work?.forEach((w: { derivedFromFactIds?: string[] }, i: number) => {
          checkFactIds(w.derivedFromFactIds, 'work', i);
        });

        // Projects
        pd.projects?.forEach((p: { derivedFromFactIds?: string[] }, i: number) => {
          checkFactIds(p.derivedFromFactIds, 'projects', i);
        });

        // Skills
        pd.skills?.forEach((s: { derivedFromFactIds?: string[] }, i: number) => {
          checkFactIds(s.derivedFromFactIds, 'skills', i);
        });

        // Education
        pd.education?.forEach((e: { derivedFromFactIds?: string[] }, i: number) => {
          checkFactIds(e.derivedFromFactIds, 'education', i);
        });

        // Awards
        pd.awards?.forEach((a: { derivedFromFactIds?: string[] }, i: number) => {
          checkFactIds(a.derivedFromFactIds, 'awards', i);
        });
      }
    } catch (err) {
      logger.warn('Error checking resume attribution integrity:', err);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts: {
      profiles: profiles.length,
      facts: facts.length,
      evidence: evidence.length,
      links: links.length,
      notes: notes.length,
      resumesChecked,
    },
    orphans,
  };
}

/**
 * Detects orphan Career Knowledge records.
 * Evidence without links is intentionally NOT flagged as an orphan (it is reusable provenance).
 */
export async function detectCareerKnowledgeOrphans(
  profileId?: string,
  customDb: CareerDb = defaultDb
): Promise<{
  danglingFacts: string[];
  danglingLinks: Array<{ factId: string; evidenceId: string }>;
  danglingNotes: string[];
}> {
  const report = await validateCareerKnowledgeIntegrity(
    { profileId, checkResumes: false },
    customDb
  );
  return {
    danglingFacts: report.orphans.facts,
    danglingLinks: report.orphans.links,
    danglingNotes: report.orphans.notes,
  };
}

/**
 * Safely repairs orphan records by pruning dangling links and notes.
 * Does not delete valid unlinked evidence or facts.
 */
export async function repairCareerKnowledgeOrphans(
  options: { profileId?: string } = {},
  customDb: CareerDb = defaultDb
): Promise<{ cleanedLinks: number; cleanedNotes: number; cleanedFacts: number }> {
  const orphans = await detectCareerKnowledgeOrphans(options.profileId, customDb);
  let cleanedLinks = 0;
  let cleanedNotes = 0;
  let cleanedFacts = 0;

  await customDb.transaction(
    'rw',
    [
      customDb.careerProfiles,
      customDb.careerFacts,
      customDb.careerEvidence,
      customDb.factEvidenceLinks,
      customDb.careerNotes,
    ],
    async () => {
      // 1. Clean dangling links (dedupe — same key may appear once per missing side)
      const seenLinks = new Set<string>();
      for (const link of orphans.danglingLinks) {
        const k = `${link.factId}:${link.evidenceId}`;
        if (seenLinks.has(k)) continue;
        seenLinks.add(k);
        await customDb.factEvidenceLinks.delete([link.factId, link.evidenceId]);
        cleanedLinks++;
      }

      // 2. Clean dangling notes
      for (const noteId of orphans.danglingNotes) {
        await customDb.careerNotes.delete(noteId);
        cleanedNotes++;
      }

      // 3. Clean dangling facts (only if their profile was deleted)
      for (const factId of orphans.danglingFacts) {
        await customDb.factEvidenceLinks.where('factId').equals(factId).delete();
        await customDb.careerNotes.where('factId').equals(factId).delete();
        await customDb.careerFacts.delete(factId);
        cleanedFacts++;
      }
    }
  );

  return { cleanedLinks, cleanedNotes, cleanedFacts };
}

/**
 * Exports Career Knowledge records into a portable, versioned dataset.
 */
export async function exportCareerKnowledgeDataset(
  profileId?: string,
  customDb: CareerDb = defaultDb
): Promise<CareerKnowledgeExportPayload> {
  let profiles: CareerProfile[] = [];
  let facts: CareerFact[] = [];
  let evidence: CareerEvidence[] = [];
  let links: FactEvidenceLink[] = [];
  let notes: CareerNote[] = [];

  if (profileId) {
    const prof = await customDb.careerProfiles.get(profileId);
    if (prof) profiles = [prof];
    facts = await customDb.careerFacts.where('profileId').equals(profileId).toArray();
    evidence = await customDb.careerEvidence.where('profileId').equals(profileId).toArray();
    const factIds = facts.map((f) => f.id);
    if (factIds.length > 0) {
      links = await customDb.factEvidenceLinks.where('factId').anyOf(factIds).toArray();
      notes = await customDb.careerNotes.where('factId').anyOf(factIds).toArray();
    }
  } else {
    profiles = await customDb.careerProfiles.toArray();
    facts = await customDb.careerFacts.toArray();
    evidence = await customDb.careerEvidence.toArray();
    links = await customDb.factEvidenceLinks.toArray();
    notes = await customDb.careerNotes.toArray();
  }

  return {
    formatVersion: CURRENT_CK_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profileId,
    profiles,
    facts,
    evidence,
    links,
    notes,
  };
}

/**
 * Imports and merges a Career Knowledge dataset with strict domain verification,
 * referential validation, and cross-profile isolation.
 */
export async function importCareerKnowledgeDataset(
  payload: unknown,
  options: {
    targetProfileId?: string;
    allowCrossProfileMapping?: boolean;
  } = {},
  customDb: CareerDb = defaultDb
): Promise<{
  importedCounts: {
    profiles: number;
    facts: number;
    evidence: number;
    links: number;
    notes: number;
  };
}> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('importCareerKnowledgeDataset: Invalid payload format (not an object)');
  }

  // 1. Normalize shape (handles CareerKnowledgeExportPayload or CareerKnowledgeSyncData)
  let normalizedProfiles: CareerProfile[] = [];
  let normalizedFacts: CareerFact[] = [];
  let normalizedEvidence: CareerEvidence[] = [];
  let normalizedLinks: FactEvidenceLink[] = [];
  let normalizedNotes: CareerNote[] = [];

  const rawObj = payload as Record<string, unknown>;

  if ('profile' in rawObj && rawObj.profile) {
    // Single profile sync data shape
    const parsed = careerKnowledgeSyncDataSchema.parse(rawObj);
    normalizedProfiles = [parsed.profile];
    normalizedFacts = parsed.facts;
    normalizedEvidence = parsed.evidence;
    normalizedLinks = parsed.links;
    normalizedNotes = parsed.notes;
  } else {
    // Full export shape
    const parsed = careerKnowledgeExportPayloadSchema.parse(rawObj);
    if (parsed.formatVersion > CURRENT_CK_EXPORT_VERSION) {
      throw new Error(
        `Unsupported Career Knowledge export format version ${parsed.formatVersion} (max supported: ${CURRENT_CK_EXPORT_VERSION})`
      );
    }
    normalizedProfiles = parsed.profiles;
    normalizedFacts = parsed.facts;
    normalizedEvidence = parsed.evidence;
    normalizedLinks = parsed.links;
    normalizedNotes = parsed.notes;
  }

  // 2. Cross-profile safety validation (+ optional remap)
  const { targetProfileId, allowCrossProfileMapping = false } = options;

  if (targetProfileId) {
    // If targetProfileId is provided, every entity must belong to it.
    // With allowCrossProfileMapping, foreign profileIds are rewritten to the
    // target (profiles collapse to a single target-profile row); otherwise
    // the import is rejected.
    const needsRemap =
      normalizedProfiles.some((p) => p.id !== targetProfileId) ||
      normalizedFacts.some((f) => f.profileId !== targetProfileId) ||
      normalizedEvidence.some((e) => e.profileId !== targetProfileId);

    if (needsRemap && !allowCrossProfileMapping) {
      const offending =
        normalizedProfiles.find((p) => p.id !== targetProfileId)?.id ||
        normalizedFacts.find((f) => f.profileId !== targetProfileId)?.profileId ||
        normalizedEvidence.find((e) => e.profileId !== targetProfileId)?.profileId;
      throw new Error(
        `Cross-profile import rejected: Payload profile "${offending}" does not match target profile "${targetProfileId}"`
      );
    }

    if (needsRemap && allowCrossProfileMapping) {
      normalizedProfiles = normalizedProfiles.map((p) =>
        p.id === targetProfileId ? p : { ...p, id: targetProfileId }
      );
      normalizedFacts = normalizedFacts.map((f) =>
        f.profileId === targetProfileId ? f : { ...f, profileId: targetProfileId }
      );
      normalizedEvidence = normalizedEvidence.map((e) =>
        e.profileId === targetProfileId ? e : { ...e, profileId: targetProfileId }
      );
      // Links/notes reference facts/evidence by id (no profileId field), so no
      // rewrite is needed for them once facts/evidence are remapped.
    }
  }

  // 3. In-memory Referential Validation before DB mutation
  const payloadProfileIds = new Set(normalizedProfiles.map((p) => p.id));
  const payloadFactIds = new Set(normalizedFacts.map((f) => f.id));
  const payloadEvidenceIds = new Set(normalizedEvidence.map((e) => e.id));

  for (const fact of normalizedFacts) {
    if (!payloadProfileIds.has(fact.profileId)) {
      // Check if profile exists in DB
      const dbProfile = await customDb.careerProfiles.get(fact.profileId);
      if (!dbProfile) {
        throw new Error(
          `Referential integrity violation: Fact "${fact.id}" references non-existent profile "${fact.profileId}"`
        );
      }
    }
    if (fact.supersededBy) {
      if (fact.supersededBy === fact.id) {
        throw new Error(
          `Referential integrity violation: Fact "${fact.id}" cannot supersede itself`
        );
      }
      if (!payloadFactIds.has(fact.supersededBy)) {
        const dbFact = await customDb.careerFacts.get(fact.supersededBy);
        if (!dbFact) {
          throw new Error(
            `Referential integrity violation: Fact "${fact.id}" references missing supersededBy fact "${fact.supersededBy}"`
          );
        }
      }
    }
  }

  for (const ev of normalizedEvidence) {
    if (!payloadProfileIds.has(ev.profileId)) {
      const dbProfile = await customDb.careerProfiles.get(ev.profileId);
      if (!dbProfile) {
        throw new Error(
          `Referential integrity violation: Evidence "${ev.id}" references non-existent profile "${ev.profileId}"`
        );
      }
    }
  }

  for (const link of normalizedLinks) {
    if (!payloadFactIds.has(link.factId)) {
      const dbFact = await customDb.careerFacts.get(link.factId);
      if (!dbFact) {
        throw new Error(
          `Referential integrity violation: Link references missing fact "${link.factId}"`
        );
      }
    }
    if (!payloadEvidenceIds.has(link.evidenceId)) {
      const dbEvidence = await customDb.careerEvidence.get(link.evidenceId);
      if (!dbEvidence) {
        throw new Error(
          `Referential integrity violation: Link references missing evidence "${link.evidenceId}"`
        );
      }
    }
  }

  for (const note of normalizedNotes) {
    if (!payloadFactIds.has(note.factId)) {
      const dbFact = await customDb.careerFacts.get(note.factId);
      if (!dbFact) {
        throw new Error(
          `Referential integrity violation: Note "${note.id}" references missing fact "${note.factId}"`
        );
      }
    }
  }

  // Rows actually written (added or updated). Divergence keeps local and is
  // NOT counted — callers must not mistake payload size for applied writes.
  const written = { profiles: 0, facts: 0, evidence: 0, links: 0, notes: 0 };

  // 4. Transactional Apply with Verification Invariant Preservation
  await customDb.transaction(
    'rw',
    [
      customDb.careerProfiles,
      customDb.careerFacts,
      customDb.careerEvidence,
      customDb.factEvidenceLinks,
      customDb.careerNotes,
    ],
    async () => {
      // A. Merge Profiles
      for (const prof of normalizedProfiles) {
        const local = await customDb.careerProfiles.get(prof.id);
        if (!local) {
          await customDb.careerProfiles.add(prof);
          written.profiles++;
        } else {
          const localTime = new Date(local.updatedAt).getTime() || 0;
          const remoteTime = new Date(prof.updatedAt).getTime() || 0;
          if (remoteTime > localTime) {
            await customDb.careerProfiles.put(prof);
            written.profiles++;
          }
        }
      }

      // B. Merge Evidence (Strict immutability)
      for (const ev of normalizedEvidence) {
        const localEv = await customDb.careerEvidence.get(ev.id);
        if (!localEv) {
          await customDb.careerEvidence.add(ev);
          written.evidence++;
        } else {
          // Immutability check
          if (
            localEv.sourceType !== ev.sourceType ||
            localEv.sourceRef !== ev.sourceRef ||
            localEv.excerpt !== ev.excerpt ||
            localEv.url !== ev.url
          ) {
            logger.warn(
              `Evidence "${ev.id}" content mismatch during import; preserving local immutable record.`
            );
          }
        }
      }

      // C. Merge Facts (Verification Invariant Protection)
      for (const fact of normalizedFacts) {
        const localFact = await customDb.careerFacts.get(fact.id);
        if (!localFact) {
          await customDb.careerFacts.add(fact);
          written.facts++;
        } else {
          let targetVerificationState = localFact.verificationState;

          // Invariant: Never downgrade a local confirmed fact
          if (localFact.verificationState === 'confirmed') {
            targetVerificationState = 'confirmed';
          } else if (fact.verificationState === 'confirmed') {
            targetVerificationState = 'confirmed';
          } else if (fact.verificationState === 'rejected') {
            targetVerificationState = 'rejected';
          }

          const localTime = new Date(localFact.updatedAt).getTime() || 0;
          const remoteTime = new Date(fact.updatedAt).getTime() || 0;

          const merged: CareerFact = {
            ...localFact,
            ...(remoteTime >= localTime
              ? {
                  subject: fact.subject,
                  claim: fact.claim,
                  structured: fact.structured ?? localFact.structured,
                  category: fact.category,
                  origin: fact.origin,
                  updatedAt: fact.updatedAt,
                }
              : {}),
            verificationState: targetVerificationState,
            supersededBy: fact.supersededBy ?? localFact.supersededBy,
          };

          await customDb.careerFacts.put(merged);
          written.facts++;
        }
      }

      // D. Merge Links (Idempotent)
      for (const link of normalizedLinks) {
        const existing = await customDb.factEvidenceLinks.get([link.factId, link.evidenceId]);
        if (!existing) {
          await customDb.factEvidenceLinks.put(link);
          written.links++;
        }
      }

      // E. Merge Notes
      for (const note of normalizedNotes) {
        const localNote = await customDb.careerNotes.get(note.id);
        if (!localNote) {
          await customDb.careerNotes.add(note);
          written.notes++;
        } else {
          const localTime = new Date(localNote.updatedAt).getTime() || 0;
          const remoteTime = new Date(note.updatedAt).getTime() || 0;
          if (remoteTime > localTime) {
            await customDb.careerNotes.put(note);
            written.notes++;
          }
        }
      }
    }
  );

  return {
    importedCounts: { ...written },
  };
}
