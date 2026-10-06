// Zod schemas for the Career Knowledge domain (Phase 1).
//
// Defined inside the domain so dependency direction stays features →
// services → lib/types; the AI layer re-exports these (ai → domain), never
// the reverse.

import { z } from 'zod';

export const careerFactCategorySchema = z.enum([
  'experience',
  'project',
  'skill',
  'achievement',
  'education',
  'certification',
  'preference',
  'goal',
]);

export const verificationStateSchema = z.enum([
  'observed',
  'needs_confirmation',
  'confirmed',
  'rejected',
]);

export const factOriginSchema = z.enum(['user', 'ai_inference', 'migration', 'external']);

export const evidenceSourceTypeSchema = z.enum([
  'user',
  'ai_conversation',
  'github',
  'web_search',
  'browser_tinyfish',
  'uploaded_document',
  'other',
]);

export const factEvidenceRelationSchema = z.enum(['supports', 'contradicts', 'contextual']);

export const careerFactSchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  category: careerFactCategorySchema,
  subject: z.string().min(1),
  claim: z.string().min(1),
  structured: z.record(z.string(), z.unknown()).optional(),
  verificationState: verificationStateSchema,
  origin: factOriginSchema,
  supersededBy: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type CareerFactAIResponse = z.infer<typeof careerFactSchema>;

export const careerEvidenceSchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  sourceType: evidenceSourceTypeSchema,
  sourceRef: z.string().optional(),
  excerpt: z.string().optional(),
  url: z.string().optional(),
  capturedAt: z.string().min(1),
});

export const careerNoteSchema = z.object({
  id: z.string().min(1),
  factId: z.string().min(1),
  scope: z.literal('global'),
  text: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

// AI/service boundary schema for fact normalization. A candidate fact can
// express a claim + source context, but CANNOT represent a verification
// state at all — `confirmed` is intentionally not expressible here, so AI
// output can never bypass user confirmation. The domain assigns
// `needs_confirmation` to normalized candidates.
export const candidateCareerFactSchema = z.object({
  category: careerFactCategorySchema,
  subject: z.string().min(1),
  claim: z.string().min(1),
  structured: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().optional(),
});

export type CandidateCareerFact = z.infer<typeof candidateCareerFactSchema>;

export const factNormalizationSchema = z.object({
  facts: z.array(candidateCareerFactSchema),
});

export type FactNormalizationAIResponse = z.infer<typeof factNormalizationSchema>;

export const questionWordingSchema = z.object({
  question: z.string().min(1),
  answerShape: z.string().min(1),
  rationale: z.string().min(1),
});

export type QuestionWordingAIResponse = z.infer<typeof questionWordingSchema>;

export const normalizedAnswerFactSchema = z.object({
  category: careerFactCategorySchema,
  subject: z.string().min(1),
  claim: z.string().min(1),
  structured: z.record(z.string(), z.unknown()).optional(),
  explicitlyStated: z.boolean(),
  rationale: z.string().optional(),
});

export type NormalizedAnswerFact = z.infer<typeof normalizedAnswerFactSchema>;

export const answerNormalizationSchema = z.object({
  facts: z.array(normalizedAnswerFactSchema),
});

export type AnswerNormalizationAIResponse = z.infer<typeof answerNormalizationSchema>;

export const careerProfileSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive().default(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const factEvidenceLinkSchema = z.object({
  factId: z.string().min(1),
  evidenceId: z.string().min(1),
  relation: factEvidenceRelationSchema,
});

export const careerKnowledgeSyncDataSchema = z.object({
  profile: careerProfileSchema,
  facts: z.array(careerFactSchema).default([]),
  evidence: z.array(careerEvidenceSchema).default([]),
  links: z.array(factEvidenceLinkSchema).default([]),
  notes: z.array(careerNoteSchema).default([]),
});

export const syncPushPayloadSchema = z.object({
  action: z.literal('push_career_knowledge'),
  password: z.string().min(8),
  profileId: z.string().min(1),
  data: careerKnowledgeSyncDataSchema,
});

export const careerKnowledgeExportPayloadSchema = z.object({
  formatVersion: z.number().int().positive().default(1),
  exportedAt: z.string().min(1),
  profileId: z.string().optional(),
  profiles: z.array(careerProfileSchema).default([]),
  facts: z.array(careerFactSchema).default([]),
  evidence: z.array(careerEvidenceSchema).default([]),
  links: z.array(factEvidenceLinkSchema).default([]),
  notes: z.array(careerNoteSchema).default([]),
});

export type CareerKnowledgeExportPayloadZod = z.infer<typeof careerKnowledgeExportPayloadSchema>;

// --- JD Requirement Extraction Schemas (Phase 10) -------------------------

export const jdRequirementCategorySchema = z.enum([
  'skill',
  'experience',
  'education',
  'certification',
  'project',
  'achievement',
  'language',
  'location',
  'work_authorization',
]);

export const jdRequirementImportanceSchema = z.enum(['required', 'useful']);

export const jdRequirementExtractionStatusSchema = z.enum(['extracted', 'ambiguous', 'deferred']);

export const jdRequirementProvenanceSchema = z.object({
  sourceText: z.string().optional(),
  sourceSection: z
    .enum(['requirements', 'responsibilities', 'overview', 'qualifications', 'other'])
    .optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
});

export const extractedJDRequirementSchema = z.object({
  key: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  importance: jdRequirementImportanceSchema.default('useful'),
  attributes: z.record(z.string(), z.unknown()).optional(),
  extractionStatus: jdRequirementExtractionStatusSchema.default('extracted'),
  provenance: jdRequirementProvenanceSchema.optional(),
});

export type ExtractedJDRequirementAIResponse = z.infer<typeof extractedJDRequirementSchema>;

export const jdRequirementExtractionSchema = z.object({
  requirements: z.array(extractedJDRequirementSchema),
});

export type JDRequirementExtractionAIResponse = z.infer<typeof jdRequirementExtractionSchema>;

// --- AI-Assisted Resume Tailoring Schemas (Phase 11) -----------------------

export const tailoredStatementSchema = z.object({
  text: z.string().min(1),
  derivedFromFactIds: z.array(z.string().min(1)).min(1),
});

export const tailoredWorkEntitySchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  derivedFromFactIds: z.array(z.string().min(1)).min(1),
});

export const tailoredProjectEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().optional(),
  derivedFromFactIds: z.array(z.string().min(1)).min(1),
});

export const tailoredSkillEntitySchema = z.object({
  name: z.string().min(1),
  level: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  derivedFromFactIds: z.array(z.string().min(1)).min(1),
});

export const tailoredEducationEntitySchema = z.object({
  institution: z.string().min(1),
  area: z.string().optional().default(''),
  studyType: z.string().optional().default(''),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional(),
  derivedFromFactIds: z.array(z.string().min(1)).min(1),
});

export const tailoredAwardEntitySchema = z.object({
  title: z.string().min(1),
  date: z.string().optional(),
  awarder: z.string().optional(),
  summary: z.string().optional(),
  derivedFromFactIds: z.array(z.string().min(1)).min(1),
});

export const resumeTailoringAISchema = z.object({
  summary: tailoredStatementSchema.optional(),
  work: z.array(tailoredWorkEntitySchema).default([]),
  projects: z.array(tailoredProjectEntitySchema).default([]),
  skills: z.array(tailoredSkillEntitySchema).default([]),
  education: z.array(tailoredEducationEntitySchema).default([]),
  awards: z.array(tailoredAwardEntitySchema).default([]),
});

export type ResumeTailoringAIResponse = z.infer<typeof resumeTailoringAISchema>;
