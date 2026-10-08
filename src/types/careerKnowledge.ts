// Career Knowledge domain contract (Phase 1).
//
// Career Knowledge is the canonical source of personal career claims.
// A Resume/CV is a presentation/projection of this knowledge; external
// sources provide evidence/observations, not truth.
//
// Phase 1 defines the domain contract only: no persistence, UI, API,
// cloud sync, Resume projection, or external providers.

/** Constrained category taxonomy for a career claim. */
export type CareerFactCategory =
  | 'experience'
  | 'project'
  | 'skill'
  | 'achievement'
  | 'education'
  | 'certification'
  | 'preference'
  | 'goal';

/**
 * Verification lifecycle state. These are domain states, NOT confidence
 * scores. Only an explicit user action may reach `confirmed`.
 */
export type VerificationState = 'observed' | 'needs_confirmation' | 'confirmed' | 'rejected';

/**
 * How a fact entered the system. Distinct from verification: `origin`
 * never implies a verification state (e.g. `origin: 'user'` is NOT
 * equivalent to `verificationState: 'confirmed'`).
 */
export type FactOrigin = 'user' | 'ai_inference' | 'migration' | 'external';

/**
 * Who/what is attempting a domain mutation. Only `user` is a human-driven
 * actor permitted to confirm, reject, or invalidate a fact.
 */
export type Actor = 'user' | 'ai' | 'migration' | 'external' | 'system';

/** Where an observation/evidence record came from. */
export type EvidenceSourceType =
  | 'user'
  | 'ai_conversation'
  | 'github'
  | 'web_search'
  | 'browser_tinyfish'
  | 'uploaded_document'
  | 'other';

/** How a piece of evidence relates to a fact. */
export type FactEvidenceRelation = 'supports' | 'contradicts' | 'contextual';

/**
 * Lightweight aggregate root representing the owner/context of Career
 * Knowledge. NOT an authentication/account system.
 */
export interface CareerProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

/**
 * One atomic, independently confirmable career claim.
 *
 * NOTE: there is intentionally no numeric `confidence` field. The domain
 * distinguishes evidence and verification state; a probability-like field
 * could be mistaken for confirmation.
 */
export interface CareerFact {
  id: string;
  profileId: string;
  category: CareerFactCategory;
  /** Short noun phrase the claim is about (e.g. "Go", "Acme Corp"). */
  subject: string;
  /** Human-readable canonical assertion; understandable without `structured`. */
  claim: string;
  /** Optional machine-matching payload. MUST NOT contradict `claim`. */
  structured?: Record<string, unknown>;
  verificationState: VerificationState;
  origin: FactOrigin;
  /** When a semantic change produced a replacement fact, points to it. */
  supersededBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reusable provenance record. Evidence carries NO verification state and
 * never becomes a confirmed claim on its own.
 */
export interface CareerEvidence {
  id: string;
  profileId: string;
  sourceType: EvidenceSourceType;
  /** Opaque reference within the source (repo id, doc id, message id, …). */
  sourceRef?: string;
  excerpt?: string;
  url?: string;
  capturedAt: string;
}

/** Many-to-many association between a fact and a piece of evidence. */
export interface FactEvidenceLink {
  factId: string;
  evidenceId: string;
  relation: FactEvidenceRelation;
}

/**
 * Canonical/global Knowledge Note attached to a fact. It travels with the
 * fact across CVs. It is NOT itself a career fact and holds no CV-specific
 * instructions.
 */
export interface CareerNote {
  id: string;
  factId: string;
  scope: 'global';
  text: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transient application input representing information a caller wants to clarify.
 * Does NOT become a persistent database entity or a Resume field.
 */
export interface KnowledgeRequirement {
  key: string;
  category: string;
  description: string;
  importance?: 'required' | 'useful';
}

/**
 * Normalized categories for Job Description requirements.
 */
export type JDRequirementCategory =
  | 'skill'
  | 'experience'
  | 'education'
  | 'certification'
  | 'project'
  | 'achievement'
  | 'language'
  | 'location'
  | 'work_authorization'
  | string;

export type JDRequirementImportance = 'required' | 'useful';

export type JDRequirementExtractionStatus = 'extracted' | 'ambiguous' | 'deferred';

export interface JDRequirementProvenance {
  sourceText?: string;
  sourceSection?: 'requirements' | 'responsibilities' | 'overview' | 'qualifications' | 'other';
  startOffset?: number;
  endOffset?: number;
}

/**
 * Normalized Job Description requirement.
 * Extends Phase 4 KnowledgeRequirement with stable deterministic identity,
 * structured attributes, extraction status, and provenance.
 */
export interface JDRequirement extends KnowledgeRequirement {
  id: string;
  jdId?: string;
  key: string;
  category: JDRequirementCategory;
  description: string;
  importance?: JDRequirementImportance;
  attributes?: Record<string, unknown>;
  extractionStatus?: JDRequirementExtractionStatus;
  provenance?: JDRequirementProvenance;
}

export type RequirementMatchStatus =
  | 'satisfied'
  | 'uncertain'
  | 'missing'
  | 'conflicting'
  | 'unsupported';

export interface RequirementMatchResult {
  requirement: JDRequirement;
  status: RequirementMatchStatus;
  matchingFactIds: string[];
  matchingEvidenceIds: string[];
  explanation: string;
  conflictingFactIds?: string[];
}

export interface JDMatchSummary {
  total: number;
  satisfied: number;
  uncertain: number;
  missing: number;
  conflicting: number;
  unsupported: number;
}

export interface JDMatchReport {
  profileId: string;
  jdId?: string;
  matchedAt: string;
  results: RequirementMatchResult[];
  summary: JDMatchSummary;
}

export type GapType = 'missing' | 'uncertain' | 'conflicting';

/**
 * Detected discrepancy between target requirements and current Career Knowledge.
 */
export interface KnowledgeGap {
  id: string;
  requirementKey: string;
  requirement: KnowledgeRequirement;
  type: GapType;
  matchingFacts: CareerFact[];
  description: string;
}

export type QuestionType =
  | 'confirm_existing_fact'
  | 'fill_missing_detail'
  | 'resolve_conflict'
  | 'provide_new_fact';

/**
 * Structured plan for a question before generating natural-language wording.
 */
export interface QuestionPlan {
  gapId: string;
  requirementKey: string;
  reason: string;
  questionType: QuestionType;
  targetFactShape: {
    category: CareerFactCategory;
    subject: string;
    claim: string;
    structured?: Record<string, unknown>;
  };
  sourceContext?: string;
}

/**
 * Result of generating AI wording for a question plan.
 */
export interface QuestionGenerationResult {
  plan: QuestionPlan;
  question: string;
  answerShape: string;
  rationale: string;
}

/**
 * Result of normalizing a user answer into candidate facts and provenance.
 */
export interface AnswerNormalizationResult {
  candidateFacts: CareerFact[];
  evidence: CareerEvidence[];
  links: FactEvidenceLink[];
}

/**
 * Query parameters for fetching external career-related evidence.
 */
export interface EvidenceQuery {
  profileId: string;
  subject: string;
  query: string;
}

/**
 * Normalizable raw external provider observation.
 */
export interface EvidenceObservation {
  sourceType: EvidenceSourceType;
  sourceRef: string;
  title?: string;
  excerpt?: string;
  url?: string;
  capturedAt: string;
  metadata?: unknown;
}

// --- AI-Assisted Resume Tailoring (Phase 11) --------------------------------

export interface TailoredResumeStatement {
  text: string;
  derivedFromFactIds: string[];
}

export interface TailorResumeWithCareerKnowledgeRequest {
  profileId: string;
  jdMatchReport: JDMatchReport;
  baseResume?: import('@/types/resume').ResumeData;
  targetJobDescription?: string;
  targetJobTitle?: string;
  targetCompany?: string;
  /** Presentation-only user instructions (global + per-job). Never authorizes new claims. */
  additionalInstructions?: string;
}

export interface TailoringValidationIssue {
  kind:
    | 'unauthorized_fact'
    | 'unconfirmed_fact'
    | 'foreign_profile_fact'
    | 'superseded_fact'
    | 'missing_attribution'
    | 'metric_inflation'
    | 'unsupported_claim';
  detail: string;
  entityName?: string;
  factId?: string;
}

export interface ProjectionAttribution {
  factId: string;
  /** ResumeData section the fact landed in: work | education | skills | projects | awards | basics. */
  section: string;
  /** Index of the projected entity inside that section, after ordering. */
  index: number;
}

export interface TailorResumeWithCareerKnowledgeResult {
  success: boolean;
  tailoredResumeData: import('@/types/resume').ResumeData;
  attributions: ProjectionAttribution[];
  usedFactIds: string[];
  fallbackUsed: boolean;
  validationIssues: TailoringValidationIssue[];
  error?: string;
}

// --- Grounded Resume Evaluation & Tailoring Quality Harness (Phase 12) ------

export type SemanticStrengtheningClassification = 'preserved' | 'strengthened' | 'contradicted';

export interface SemanticStrengtheningIssue {
  entityName: string;
  sourceText: string;
  tailoredText: string;
  detectedPattern: string;
  classification: SemanticStrengtheningClassification;
  explanation: string;
}

export interface TailoringEvaluationMetadata {
  evaluatorVersion: string;
  promptVersion?: string;
  fixtureVersion?: string;
  evaluatedAt: string;
}

export interface TailoringEvaluationResult {
  // Dimension pass/fail flags
  structuralPass: boolean;
  sourceAuthorizationPass: boolean;
  attributionPass: boolean;
  numericFidelityPass: boolean;
  dateFidelityPass: boolean;
  entityFidelityPass: boolean;
  semanticStrengtheningPass: boolean;
  unsupportedScalePass: boolean;
  unsupportedSeniorityPass: boolean;
  requirementNonClaimPass: boolean;
  relevancePass: boolean;
  fallbackUsed: boolean;
  overallPass: boolean;

  // Granular issue arrays
  validationIssues: TailoringValidationIssue[];
  semanticStrengtheningIssues: SemanticStrengtheningIssue[];
  unsupportedScaleIssues: string[];
  unsupportedSeniorityIssues: string[];
  unsupportedRequirementClaims: string[];
  entityFidelityIssues: string[];
  dateFidelityIssues: string[];
  numericFidelityIssues: string[];
  relevanceNotes: string[];

  // Reproducibility & version metadata
  metadata: TailoringEvaluationMetadata;
}

export interface TailoredResumeAIResponse {
  summary?: {
    text: string;
    derivedFromFactIds: string[];
  };
  work?: Array<{
    name: string;
    position: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
    derivedFromFactIds: string[];
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    derivedFromFactIds: string[];
  }>;
  skills?: Array<{
    name: string;
    level?: string;
    keywords?: string[];
    derivedFromFactIds: string[];
  }>;
  education?: Array<{
    institution: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    derivedFromFactIds: string[];
  }>;
  awards?: Array<{
    title: string;
    date?: string;
    awarder?: string;
    summary?: string;
    derivedFromFactIds: string[];
  }>;
}

export interface TailoringGoldenFixture {
  id: string;
  name: string;
  description: string;
  profileId: string;
  facts: CareerFact[];
  targetJobDescription?: string;
  targetJobTitle?: string;
  targetCompany?: string;
  jdMatchReport: JDMatchReport;
  baseResume?: import('@/types/resume').ResumeData;
  authorizedFactIds: string[];
  validTailoredResponse: TailoredResumeAIResponse;
  expectedRelevanceFocus: string[];
  version?: string;
}

export interface TailoringAdversarialFixture {
  id: string;
  name: string;
  category:
    | 'unsupported_skill'
    | 'unsupported_employer'
    | 'invented_metric'
    | 'inflated_metric'
    | 'strengthened_leadership'
    | 'invented_seniority'
    | 'invented_production_scale'
    | 'unsupported_certification'
    | 'foreign_profile_fact'
    | 'unconfirmed_fact'
    | 'superseded_fact'
    | 'missing_requirement_claim';
  description: string;
  profileId: string;
  facts: CareerFact[];
  jdMatchReport: JDMatchReport;
  baseResume?: import('@/types/resume').ResumeData;
  targetJobTitle?: string;
  targetJobDescription?: string;
  unsafeResponse: TailoredResumeAIResponse;
  expectedFailureDimension:
    | 'sourceAuthorizationPass'
    | 'attributionPass'
    | 'numericFidelityPass'
    | 'dateFidelityPass'
    | 'entityFidelityPass'
    | 'semanticStrengtheningPass'
    | 'unsupportedScalePass'
    | 'unsupportedSeniorityPass'
    | 'requirementNonClaimPass';
}

// --- Data Lifecycle, Recovery & Migration Hardening (Phase 14) -------------

export type IntegrityIssueKind =
  | 'missing_profile'
  | 'missing_fact'
  | 'missing_evidence'
  | 'cross_profile_link'
  | 'invalid_verification_state'
  | 'invalid_origin'
  | 'invalid_category'
  | 'invalid_supersession'
  | 'supersession_cycle'
  | 'malformed_timestamp'
  | 'broken_resume_attribution'
  | 'schema_mismatch';

export interface IntegrityIssue {
  kind: IntegrityIssueKind;
  entityType: 'profile' | 'fact' | 'evidence' | 'link' | 'note' | 'resume';
  entityId: string;
  detail: string;
  profileId?: string;
}

export interface CareerIntegrityReport {
  valid: boolean;
  errors: IntegrityIssue[];
  warnings: IntegrityIssue[];
  counts: {
    profiles: number;
    facts: number;
    evidence: number;
    links: number;
    notes: number;
    resumesChecked: number;
  };
  orphans: {
    facts: string[];
    evidence: string[];
    links: Array<{ factId: string; evidenceId: string }>;
    notes: string[];
  };
}

export interface CareerKnowledgeExportPayload {
  formatVersion: number;
  exportedAt: string;
  profileId?: string;
  profiles: CareerProfile[];
  facts: CareerFact[];
  evidence: CareerEvidence[];
  links: FactEvidenceLink[];
  notes: CareerNote[];
}
