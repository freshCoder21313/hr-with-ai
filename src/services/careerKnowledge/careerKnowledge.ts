// Career Knowledge domain logic (Phase 1).
//
// Pure TypeScript. No React, Dexie, PostgreSQL, API routes, or AI provider
// dependencies. The functions here are the ONLY sanctioned way to create or
// transition facts, so that verification invariants cannot be bypassed by
// generic data mutation.

import { careerEvidenceSchema, careerFactSchema, careerNoteSchema } from './schemas';
import type {
  Actor,
  CareerEvidence,
  CareerFact,
  CareerFactCategory,
  CareerNote,
  CareerProfile,
  EvidenceSourceType,
  FactEvidenceLink,
  FactEvidenceRelation,
  FactOrigin,
  VerificationState,
} from '@/types/careerKnowledge';

export const CAREER_SCHEMA_VERSION = 1;

/** Injectable clock/id so domain logic stays deterministic in tests. */
export interface DomainContext {
  now?: () => string;
  id?: () => string;
}

function ctxNow(ctx?: DomainContext): string {
  return (ctx?.now ?? (() => new Date().toISOString()))();
}
function ctxId(ctx?: DomainContext): string {
  return (ctx?.id ?? (() => crypto.randomUUID()))();
}

/** Thrown when a requested verification transition violates the state machine. */
export class VerificationTransitionError extends Error {
  constructor(
    public readonly from: VerificationState,
    public readonly to: VerificationState,
    public readonly actor: Actor,
    message: string
  ) {
    super(message);
    this.name = 'VerificationTransitionError';
  }
}

interface TransitionRule {
  from: VerificationState;
  to: VerificationState;
  /** When true, only a human `user` actor may perform the transition. */
  userOnly: boolean;
}

// The complete allowed transition table. Any (from, to) not present here is
// forbidden. Every transition INTO `confirmed` is user-only, and there is no
// rule that lets a machine actor reach `confirmed`.
const TRANSITIONS: readonly TransitionRule[] = [
  { from: 'observed', to: 'needs_confirmation', userOnly: false },
  { from: 'needs_confirmation', to: 'confirmed', userOnly: true },
  { from: 'needs_confirmation', to: 'rejected', userOnly: true },
  { from: 'confirmed', to: 'needs_confirmation', userOnly: true },
  { from: 'confirmed', to: 'rejected', userOnly: true },
  { from: 'observed', to: 'rejected', userOnly: true },
];

export function findTransition(
  from: VerificationState,
  to: VerificationState
): TransitionRule | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function canTransition(
  from: VerificationState,
  to: VerificationState,
  actor: Actor
): boolean {
  const rule = findTransition(from, to);
  if (!rule) return false;
  return rule.userOnly ? actor === 'user' : true;
}

/**
 * Apply a verification transition, returning a new fact. Throws
 * `VerificationTransitionError` if the transition is not permitted for the
 * given actor. This is the single checkpoint all state changes flow through.
 */
export function transitionVerification(
  fact: CareerFact,
  to: VerificationState,
  actor: Actor,
  ctx?: DomainContext
): CareerFact {
  const from = fact.verificationState;
  const rule = findTransition(from, to);
  if (!rule) {
    throw new VerificationTransitionError(
      from,
      to,
      actor,
      `No transition from "${from}" to "${to}".`
    );
  }
  if (rule.userOnly && actor !== 'user') {
    throw new VerificationTransitionError(
      from,
      to,
      actor,
      `Transition "${from}" -> "${to}" requires an explicit user action; actor "${actor}" is not permitted.`
    );
  }
  return { ...fact, verificationState: to, updatedAt: ctxNow(ctx) };
}

export function createCareerProfile(ctx?: DomainContext): CareerProfile {
  const ts = ctxNow(ctx);
  return {
    id: ctxId(ctx),
    createdAt: ts,
    updatedAt: ts,
    schemaVersion: CAREER_SCHEMA_VERSION,
  };
}

export interface CreateCareerFactInput {
  profileId: string;
  category: CareerFactCategory;
  subject: string;
  claim: string;
  structured?: Record<string, unknown>;
  origin: FactOrigin;
  /** Only `observed` or `needs_confirmation` are valid at creation. */
  verificationState?: Extract<VerificationState, 'observed' | 'needs_confirmation'>;
}

/**
 * Create a fact. A newly created fact can NEVER be `confirmed` (or
 * `rejected`): confirmation is only reachable through an explicit user
 * transition, regardless of origin.
 */
export function createCareerFact(input: CreateCareerFactInput, ctx?: DomainContext): CareerFact {
  const ts = ctxNow(ctx);
  const verificationState: VerificationState = input.verificationState ?? 'observed';
  if (verificationState !== 'observed' && verificationState !== 'needs_confirmation') {
    throw new Error(
      `createCareerFact cannot start in "${verificationState}"; confirmation is only reachable via an explicit user transition.`
    );
  }
  const fact: CareerFact = {
    id: ctxId(ctx),
    profileId: input.profileId,
    category: input.category,
    subject: input.subject,
    claim: input.claim,
    ...(input.structured !== undefined ? { structured: input.structured } : {}),
    verificationState,
    origin: input.origin,
    createdAt: ts,
    updatedAt: ts,
  };
  // Validate shape + enum membership against the Zod contract.
  return careerFactSchema.parse(fact) as CareerFact;
}

export function requestConfirmation(
  fact: CareerFact,
  actor: Actor = 'system',
  ctx?: DomainContext
): CareerFact {
  return transitionVerification(fact, 'needs_confirmation', actor, ctx);
}

export function confirmCareerFact(fact: CareerFact, actor: Actor, ctx?: DomainContext): CareerFact {
  return transitionVerification(fact, 'confirmed', actor, ctx);
}

export function rejectCareerFact(fact: CareerFact, actor: Actor, ctx?: DomainContext): CareerFact {
  return transitionVerification(fact, 'rejected', actor, ctx);
}

/** Move a confirmed fact back to `needs_confirmation` for re-review (user only). */
export function invalidateCareerFact(
  fact: CareerFact,
  actor: Actor,
  ctx?: DomainContext
): CareerFact {
  return transitionVerification(fact, 'needs_confirmation', actor, ctx);
}

export interface PresentationUpdate {
  subject?: string;
  claim?: string;
  structured?: Record<string, unknown>;
}

/**
 * Presentation-neutral correction (typo/metadata). Preserves fact identity
 * and verification state. Does NOT change category or origin, and must not be
 * used to materially change the meaning of a claim (use
 * `supersedeCareerFact` for that).
 */
export function updateCareerFactPresentation(
  fact: CareerFact,
  update: PresentationUpdate,
  ctx?: DomainContext
): CareerFact {
  return {
    ...fact,
    ...(update.subject !== undefined ? { subject: update.subject } : {}),
    ...(update.claim !== undefined ? { claim: update.claim } : {}),
    ...(update.structured !== undefined ? { structured: update.structured } : {}),
    updatedAt: ctxNow(ctx),
  };
}

export interface SupersedeInput {
  category?: CareerFactCategory;
  subject?: string;
  claim: string;
  structured?: Record<string, unknown>;
  origin?: FactOrigin;
}

/**
 * Materially change a claim without rewriting history: creates a NEW fact and
 * marks the old one `supersededBy` the new one. The old fact's claim/state are
 * never silently rewritten. The new fact starts unconfirmed.
 */
export function supersedeCareerFact(
  oldFact: CareerFact,
  input: SupersedeInput,
  ctx?: DomainContext
): { previous: CareerFact; next: CareerFact } {
  const next = createCareerFact(
    {
      profileId: oldFact.profileId,
      category: input.category ?? oldFact.category,
      subject: input.subject ?? oldFact.subject,
      claim: input.claim,
      structured: input.structured,
      origin: input.origin ?? oldFact.origin,
      verificationState: 'needs_confirmation',
    },
    ctx
  );
  const previous: CareerFact = { ...oldFact, supersededBy: next.id, updatedAt: ctxNow(ctx) };
  return { previous, next };
}

export interface CreateCareerEvidenceInput {
  profileId: string;
  sourceType: EvidenceSourceType;
  sourceRef?: string;
  excerpt?: string;
  url?: string;
}

export function createCareerEvidence(
  input: CreateCareerEvidenceInput,
  ctx?: DomainContext
): CareerEvidence {
  const evidence: CareerEvidence = {
    id: ctxId(ctx),
    profileId: input.profileId,
    sourceType: input.sourceType,
    ...(input.sourceRef !== undefined ? { sourceRef: input.sourceRef } : {}),
    ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
    ...(input.url !== undefined ? { url: input.url } : {}),
    capturedAt: ctxNow(ctx),
  };
  return careerEvidenceSchema.parse(evidence) as CareerEvidence;
}

/**
 * Link evidence to a fact. Linking is pure provenance and NEVER changes the
 * fact's verification state — evidence does not confirm claims.
 */
export function linkEvidence(
  factId: string,
  evidenceId: string,
  relation: FactEvidenceRelation
): FactEvidenceLink {
  return { factId, evidenceId, relation };
}

export interface CreateCareerNoteInput {
  factId: string;
  text: string;
}

export function createCareerNote(input: CreateCareerNoteInput, ctx?: DomainContext): CareerNote {
  const ts = ctxNow(ctx);
  const note: CareerNote = {
    id: ctxId(ctx),
    factId: input.factId,
    scope: 'global',
    text: input.text,
    createdAt: ts,
    updatedAt: ts,
  };
  return careerNoteSchema.parse(note) as CareerNote;
}

export function updateCareerNote(note: CareerNote, text: string, ctx?: DomainContext): CareerNote {
  return { ...note, text, updatedAt: ctxNow(ctx) };
}
