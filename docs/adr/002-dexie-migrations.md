# ADR 002: Dexie migration policy

**Status:** Accepted  
**Date:** 2026-07-09

## Context

`src/lib/db.ts` stacks Dexie versions **2 → 16**. New installs still run the chain; existing users upgrade incrementally.

## Decision

1. **Never remove or renumber** published versions once shipped to users (would break upgrades).
2. **New schema changes** always add `this.version(N+1)` with only the changed store definitions Dexie requires.
3. **Data transforms** (e.g. compress resumes) live in hooks or one-shot upgrade callbacks, not by rewriting history.
4. **New installs:** Dexie applies all versions in order up to the latest; this is acceptable cost for a client DB.
5. **Optional future:** if version count becomes painful, introduce a one-time “export → wipe → reimport at v1” tool for power users only — not automatic.

## Schema History

- **Versions 2 → 12:** Core interview, userSettings, resumes, job recommendations, and jobs tables.
- **Versions 13 → 14:** Resume LZString compression and backfill upgrade.
- **Version 15:** Career Knowledge (Phase 2) normalized local persistence (`careerProfiles`, `careerFacts`, `careerEvidence`, `factEvidenceLinks`, `careerNotes`) with UUID primary keys and indices.
- **Version 16:** Skill Assessment history persistence (`skillAssessments: '++id, createdAt, skill, score'`).

## Resume compression

- On **write**: `parsedData` → `compressedData` (LZString UTF-16)
- On **read**: decompress into `parsedData` for callers
- Pure helpers live in `src/lib/resumeCompression.ts` for unit testing

## Consequences

- Migration ladder grows over time (documented debt).
- Compression bugs must be regression-tested without a full browser DB.
