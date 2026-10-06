# ADR 003: Career Knowledge Architecture Baseline & Release Freeze

**Status:** Accepted & Frozen  
**Date:** 2026-10-02  
**Milestone:** Phase 15 Baseline

---

## 1. Context & Scope

Across Phases 1 through 14, the HR-With-AI platform established a canonical, local-first, verified career knowledge engine. This document freezes the system architecture, core domain entities, truth boundaries, and invariant constraints.

---

## 2. Core Architectural Roles

| Component | Architecture Role | Description |
| :--- | :--- | :--- |
| **Career Knowledge** | `canonical professional knowledge` | The definitive, verified, structured source of truth representing the user's career facts, skills, experience, achievements, and education. |
| **Career Evidence** | `provenance/supporting observation` | Immutable observational artifacts (e.g. GitHub repositories, resume snippets, question transcripts) providing provenance for claims. |
| **Verification** | `explicit trust state` | Deterministic verification state machine (`observed`, `needs_confirmation`, `confirmed`, `rejected`) requiring explicit human user agency for elevation. |
| **Resume** | `presentation/projection` | A rendered presentation and ephemeral projection of canonical career facts; never a source of truth. |
| **JD (Job Description)** | `requirement context` | Structured external qualification requirements used as evaluation criteria; never candidate qualifications. |
| **AI (LLMs)** | `constrained presentation/tailoring layer` | Constrained transformation and natural language presentation generator bounded exclusively by authorized, confirmed facts. |
| **PostgreSQL (Neon)** | `remote persistence/synchronization layer` | Encrypted cloud backup, bidirectional synchronization, and multi-device persistence layer. |

---

## 3. Frozen Invariants

The following invariants are inviolable and frozen:

```text
Evidence ≠ confirmation
AI ≠ source of truth
Resume ≠ source of truth
JD requirement ≠ user qualification
confirmed ≠ inferred
projection ≠ synchronization
```

1. **Evidence is not Confirmation (`Evidence ≠ confirmation`):**
   External observations, parsed resumes, or AI inferences never automatically elevate a fact to `confirmed`. All candidates remain `needs_confirmation` or `observed` until explicit user action.

2. **AI is not the Source of Truth (`AI ≠ source of truth`):**
   AI models may only format, summarize, or translate authorized confirmed facts. Models cannot create, confirm, or alter canonical truth.

3. **Resume is not the Source of Truth (`Resume ≠ source of truth`):**
   Resumes are presentation projections. Editing a resume draft does not mutate the underlying Career Knowledge base.

4. **JD Requirement is not a Qualification (`JD requirement ≠ user qualification`):**
   A job requirement represents external demand. The presence of a requirement in a JD never implies or creates user qualification. Missing or uncertain requirements are never asserted as claims.

5. **Confirmed is not Inferred (`confirmed ≠ inferred`):**
   A claim is confirmed only by explicit human user confirmation. Inference from evidence or question answers produces unconfirmed candidates.

6. **Projection is not Synchronization (`projection ≠ synchronization`):**
   Projecting career knowledge to a resume format is a one-way deterministic rendering operation. Changes to the rendered resume do not synchronize back into canonical facts.

---

## 4. Layered Dependency Direction

Per [ADR 000](file:///run/media/tr3cyos/SantaSSD/SKS/Sources/repos/aistudio/hr-with-ai/docs/adr/000-dependency-direction.md):

```
UI / Features (src/features/*)
  ↓
Services (src/services/careerKnowledge/*, src/services/ai/*)
  ↓
Core Utilities, Database & Schemas (src/lib/*, src/types/*)
```

- `services/` never imports from `features/`.
- Domain rules (`careerKnowledge.ts`) never import persistence repositories.
- Persistence repositories enforce domain validation before committing any mutations.

---

## 5. Trust Boundaries & Security Model

1. **Cross-Profile Isolation:** All facts, evidence, links, and notes are strictly scoped by `profileId`. Cross-profile read, write, delete, link, tailoring, and import operations are rejected.
2. **Verification State Integrity:** Arbitrary payloads cannot forge `confirmed` status. Transitions to `confirmed` or `rejected` require user agency. Untrusted external imports are sanitized to `needs_confirmation`.
3. **Attribution Provenance:** Every tailored resume entry retains explicit `derivedFromFactIds` pointers traceable back to canonical facts and supporting evidence.
4. **Adversarial Safety:** 11-layer evaluation harness validates numeric fidelity, entity fidelity, date fidelity, semantic non-strengthening, and requirement non-claims with 100% detection rate on adversarial fixtures.

---

## 6. Post-Freeze Change Policy

All future engineering work on this codebase must be classified into one of the following five categories:

```text
feature
bug fix
security fix
migration
architecture change
```

- **Feature / Bug Fix / Security Fix / Migration:** Standard iterative improvements complying with the frozen invariants above.
- **Architecture Change:** Any proposed change that touches or modifies frozen invariants, domain contracts, or truth boundaries **requires an explicit new ADR, threat model review, and evaluation harness convergence**.
- **No New Numbered Phases:** Ordinary post-freeze iterations will not introduce new numbered milestone phases.
