// Career Knowledge Question Engine (Phase 4).
//
// The Question Engine identifies knowledge gaps from canonical Career Knowledge
// and plans targeted clarification questions. It uses the existing AI service
// abstraction for natural-language wording and user-answer normalization.
//
// Dependency direction: this service -> repository -> domain/types.

import { z } from 'zod';
import type {
  CareerEvidence,
  CareerFact,
  CareerFactCategory,
  FactEvidenceLink,
  KnowledgeGap,
  KnowledgeRequirement,
  QuestionPlan,
  QuestionGenerationResult,
  AnswerNormalizationResult,
} from '@/types/careerKnowledge';
import {
  questionWordingSchema,
  answerNormalizationSchema,
  type NormalizedAnswerFact,
} from '@/services/careerKnowledge/schemas';
import type { CareerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import type { DomainContext } from '@/services/careerKnowledge/careerKnowledge';
import { areFactsContradictory } from '@/services/careerKnowledge/structuredEquality';

export interface AIServiceLike {
  generateStructured<T>(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    schema: z.ZodType<T>
  ): Promise<T>;
}

// --- Deterministic Matching & Gap Detection --------------------------------

/**
 * Determine if a CareerFact matches a given KnowledgeRequirement.
 * Uses deterministic keys, categories, subject, and structured properties.
 */
export function isRequirementMatch(req: KnowledgeRequirement, fact: CareerFact): boolean {
  // Check category mapping
  const reqCat = req.category.toLowerCase();
  const factCat = fact.category.toLowerCase();

  const catMatch =
    reqCat === factCat ||
    (reqCat === 'technical' && (factCat === 'skill' || factCat === 'project')) ||
    (reqCat === 'work' && factCat === 'experience');

  if (!catMatch) return false;

  // Strip the `__N` extraction disambiguation suffix (see jdMatching): the
  // suffix keeps requirement ids unique but must not affect matching.
  const reqKeyLower = req.key.toLowerCase().replace(/__\d+$/, '');

  // 1. Match subject case-insensitively
  if (fact.subject.toLowerCase() === reqKeyLower) return true;

  // 2. Match structured properties (e.g. structured.skill, structured.company)
  if (fact.structured) {
    for (const val of Object.values(fact.structured)) {
      if (typeof val === 'string' && val.toLowerCase() === reqKeyLower) {
        return true;
      }
    }
  }

  // 3. Fallback: match subject/claim contents
  if (fact.claim.toLowerCase().includes(reqKeyLower)) return true;

  return false;
}

/**
 * Deterministically analyze current Career Knowledge against a set of requirements
 * and classify gaps into missing, uncertain, or conflicting.
 */
export function detectKnowledgeGaps(
  requirements: KnowledgeRequirement[],
  facts: CareerFact[]
): KnowledgeGap[] {
  const activeFacts = facts.filter((f) => !f.supersededBy);
  const gaps: KnowledgeGap[] = [];

  for (const req of requirements) {
    const matching = activeFacts.filter((f) => isRequirementMatch(req, f));
    const nonRejected = matching.filter((f) => f.verificationState !== 'rejected');
    const confirmed = matching.find((f) => f.verificationState === 'confirmed');

    if (matching.length === 0) {
      gaps.push({
        id: `gap:${req.key}`,
        requirementKey: req.key,
        requirement: req,
        type: 'missing',
        matchingFacts: [],
        description: `No career facts found matching requirement "${req.key}".`,
      });
    } else if (confirmed) {
      // Check for contradictions among non-rejected matching facts.
      // Same semantics as jdMatching: structured-vs-structured when both
      // sides carry a payload (key-order-stable, no wording false-positives),
      // claim-vs-claim fallback otherwise (pure-claim contradictions count).
      const contradictions = matching.filter(
        (f) =>
          f.id !== confirmed.id &&
          f.verificationState !== 'rejected' &&
          areFactsContradictory(f, confirmed)
      );
      if (contradictions.length > 0) {
        gaps.push({
          id: `gap:${req.key}:conflict`,
          requirementKey: req.key,
          requirement: req,
          type: 'conflicting',
          matchingFacts: matching,
          description: `Multiple conflicting facts found matching requirement "${req.key}".`,
        });
      }
      // Satisfied - no gap produced if confirmed and no contradictions exist.
    } else if (nonRejected.length > 0) {
      gaps.push({
        id: `gap:${req.key}:uncertain`,
        requirementKey: req.key,
        requirement: req,
        type: 'uncertain',
        matchingFacts: nonRejected,
        description: `Matching facts for requirement "${req.key}" exist but require confirmation.`,
      });
    } else {
      // All matching facts are rejected
      gaps.push({
        id: `gap:${req.key}:unresolved`,
        requirementKey: req.key,
        requirement: req,
        type: 'missing',
        matchingFacts: matching,
        description: `Previous claims matching requirement "${req.key}" were rejected by the user.`,
      });
    }
  }

  return gaps;
}

// --- Question Planning -----------------------------------------------------

/**
 * Formulate structured QuestionPlans from detected KnowledgeGaps.
 */
export function planQuestions(gaps: KnowledgeGap[]): QuestionPlan[] {
  const plans: QuestionPlan[] = [];

  for (const gap of gaps) {
    if (gap.type === 'missing') {
      let category: CareerFactCategory = 'skill';
      const reqCat = gap.requirement.category.toLowerCase();
      if (['experience', 'work'].includes(reqCat)) category = 'experience';
      else if (['project'].includes(reqCat)) category = 'project';
      else if (['achievement', 'award'].includes(reqCat)) category = 'achievement';
      else if (['education'].includes(reqCat)) category = 'education';
      else if (['certification'].includes(reqCat)) category = 'certification';
      else if (['preference'].includes(reqCat)) category = 'preference';
      else if (['goal'].includes(reqCat)) category = 'goal';

      plans.push({
        gapId: gap.id,
        requirementKey: gap.requirementKey,
        reason: `Missing career facts for "${gap.requirement.description}".`,
        questionType: 'provide_new_fact',
        targetFactShape: {
          category,
          subject: gap.requirement.key,
          claim: '',
        },
      });
    } else if (gap.type === 'uncertain') {
      const primaryFact = gap.matchingFacts[0];
      plans.push({
        gapId: gap.id,
        requirementKey: gap.requirementKey,
        reason: `Unconfirmed fact exists: "${primaryFact.claim}".`,
        questionType: 'confirm_existing_fact',
        targetFactShape: {
          category: primaryFact.category,
          subject: primaryFact.subject,
          claim: primaryFact.claim,
          structured: primaryFact.structured,
        },
        sourceContext: `Fact ID: ${primaryFact.id}, Current State: ${primaryFact.verificationState}`,
      });
    } else if (gap.type === 'conflicting') {
      const primaryFact = gap.matchingFacts[0];
      plans.push({
        gapId: gap.id,
        requirementKey: gap.requirementKey,
        reason: `Conflicting facts exist for "${gap.requirement.key}".`,
        questionType: 'resolve_conflict',
        targetFactShape: {
          category: primaryFact.category,
          subject: primaryFact.subject,
          claim: '',
        },
        sourceContext: gap.matchingFacts
          .map((f) => `[${f.verificationState}] ${f.claim}`)
          .join(' VS '),
      });
    }
  }

  return plans;
}

// --- AI Wording & Normalization --------------------------------------------

/**
 * Generate structured, natural-language clarification wording for a plan.
 * Reuses the existing AI service abstraction.
 */
export async function generateQuestionWording(
  aiService: AIServiceLike,
  plan: QuestionPlan,
  requirement: KnowledgeRequirement
): Promise<QuestionGenerationResult> {
  const prompt = `You are a professional HR assistant formulating a single, direct, natural-language clarification question to fill a specific knowledge gap.

GAP DETAILS:
- Gap Type: ${plan.questionType}
- Requirement: ${requirement.description} (Key: ${requirement.key}, Category: ${requirement.category})
- Reason for question: ${plan.reason}
- Target Fact Shape to produce: Category: ${plan.targetFactShape.category}, Subject: ${plan.targetFactShape.subject}
${plan.sourceContext ? `- Current Context: ${plan.sourceContext}` : ''}

INSTRUCTIONS:
1. Generate a clear, friendly, and professional question.
2. The question must target ONLY the missing or uncertain information described in the reason/requirement.
3. Define the expected answer shape description (e.g. "Yes/No with details" or "A short description of your role and tools").
4. Provide a brief rationale of why this question is being asked.
5. DO NOT confirm the fact or invent claims. You are only formulating the question.`;

  const messages = [
    { role: 'system' as const, content: 'You are an expert HR Interviewer.' },
    { role: 'user' as const, content: prompt },
  ];

  const result = await aiService.generateStructured(messages, questionWordingSchema);

  return {
    plan,
    question: result.question,
    answerShape: result.answerShape,
    rationale: result.rationale,
  };
}

/**
 * Parse a user's natural-language answer into candidate structured facts.
 * Strictly prevents hallucinating inferred or unstated professional experience.
 */
export async function normalizeUserAnswer(
  aiService: AIServiceLike,
  plan: QuestionPlan,
  answer: string
): Promise<NormalizedAnswerFact[]> {
  const prompt = `You are an expert HR assistant normalizer. Your task is to analyze a user's answer to a clarification question and extract structured candidate career facts.

QUESTION PLAN CONTEXT:
- Gap Id: ${plan.gapId}
- Requirement Key: ${plan.requirementKey}
- Question Type: ${plan.questionType}
- Target Fact Shape: Category: ${plan.targetFactShape.category}, Subject: ${plan.targetFactShape.subject}

USER ANSWER:
"${answer}"

CRITICAL SAFETY INSTRUCTIONS:
1. ONLY extract facts that are EXPLICITLY STATED or directly confirmed by the user's answer.
2. Set "explicitlyStated" to TRUE for facts the user clearly asserted.
3. Set "explicitlyStated" to FALSE for any details that are inferred or guessed (e.g. if the user says "I used Kubernetes at Acme", do not assume they used it in production or ran 20 clusters unless they explicitly said so).
4. Do NOT hallucinate professional claims or invent cluster counts, years of experience, or details not present in the answer.
5. Each extracted fact must be represented with its appropriate category, subject, and a clear, natural-language claim.`;

  const messages = [
    {
      role: 'system' as const,
      content: 'You are an expert HR assistant normalizer parsing user interview answers.',
    },
    { role: 'user' as const, content: prompt },
  ];

  const result = await aiService.generateStructured(messages, answerNormalizationSchema);
  return result.facts;
}

/**
 * Transactionally persist normalized candidate facts.
 * Assigns candidate verificationState to needs_confirmation per domain contract,
 * and records the raw user answer as immutable provenance evidence.
 */
export async function persistNormalizedAnswer(
  repository: CareerKnowledgeRepository,
  profileId: string,
  plan: QuestionPlan,
  normalizedFacts: NormalizedAnswerFact[],
  userAnswerText: string,
  ctx?: DomainContext
): Promise<AnswerNormalizationResult> {
  const candidateFacts: CareerFact[] = [];
  const evidence: CareerEvidence[] = [];
  const links: FactEvidenceLink[] = [];

  // Exclude inferred/hallucinated items
  const validFacts = normalizedFacts.filter((f) => f.explicitlyStated);

  if (validFacts.length === 0) {
    return { candidateFacts: [], evidence: [], links: [] };
  }

  await repository.transaction('rw', async () => {
    // 1. Create CareerEvidence for the conversation answer interaction
    const evidenceInput = {
      profileId,
      sourceType: 'user' as const,
      sourceRef: `question-answer:${plan.gapId}`,
      excerpt: `Q: ${plan.reason}\nA: ${userAnswerText}`,
    };

    const evidenceRecord = await repository.createEvidence(evidenceInput, ctx);
    evidence.push(evidenceRecord);

    // 2. Create unconfirmed CareerFact candidates and link them to the provenance
    for (const nf of validFacts) {
      const factInput = {
        profileId,
        category: nf.category,
        subject: nf.subject,
        claim: nf.claim,
        structured: nf.structured,
        verificationState: 'needs_confirmation' as const,
        origin: 'user' as const,
      };

      const factRecord = await repository.createFact(factInput, ctx);
      candidateFacts.push(factRecord);

      const linkRecord = await repository.linkEvidenceToFact(
        factRecord.id,
        evidenceRecord.id,
        'supports'
      );
      links.push(linkRecord);
    }
  });

  return {
    candidateFacts,
    evidence,
    links,
  };
}
