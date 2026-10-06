// Phase 11 — AI-Assisted Resume Tailoring.
//
// Generates a JD-aligned Resume draft using:
// 1. Existing Resume as presentation context (baseResume);
// 2. Phase 10 JD requirement match report;
// 3. ONLY authorized, eligible, confirmed CareerFact IDs;
// 4. Existing Resume projection semantics;
// 5. Existing AI structured-output abstraction.
//
// STRICT INVARIANTS:
// 1. AI is a presentation/tailoring layer, NEVER a source of professional truth.
// 2. Only confirmed, active, profile-matching, JD-eligible CareerFacts are authorized.
// 3. Every generated factual entity MUST have non-empty valid derivedFromFactIds.
// 4. Never invent experience, metrics, technologies, employers, dates, scale, or seniority.
//    Enforced by validateTailoringAIResponse (fact-ID authorization + numeric grounding
//    on summary/work/projects/skills/education/awards). `additionalInstructions` is
//    presentation-only and cannot authorize new claims — prompt text is advisory only.
// 5. Missing or uncertain JD requirements are never turned into claims.
// 6. Conflicting facts are never arbitrarily resolved.
// 7. Source Resume and Career Knowledge are NEVER mutated.
// 8. No bidirectional synchronization.

import type {
  CareerFact,
  TailoringValidationIssue,
  TailorResumeWithCareerKnowledgeRequest,
  TailorResumeWithCareerKnowledgeResult,
} from '@/types/careerKnowledge';

import type { Award, Education, Project, ResumeData, Skill, Work } from '@/types/resume';
import { withResumeDefaults } from '@/lib/resumeDefaults';
import { projectCareerKnowledgeToResume, type ProjectionAttribution } from './projection';
import { getEligibleConfirmedFactIds } from './jdMatching';
import { resumeTailoringAISchema, type ResumeTailoringAIResponse } from './schemas';
import { getCareerKnowledgeResumeTailoringPrompt } from '@/services/prompts/careerKnowledgeTailoring';
import type { AIServiceLike } from './questionEngine';
import { logger } from '@/lib/logger';

/**
 * Filters and validates that facts are:
 * 1. Matching target profileId;
 * 2. In confirmed verification state;
 * 3. Active (not superseded);
 * 4. Explicitly included in the eligible fact IDs from Phase 10 matching.
 */
export function getAuthorizedConfirmedFacts(
  facts: CareerFact[],
  profileId: string,
  eligibleFactIds: string[]
): {
  authorizedFacts: CareerFact[];
  unauthorizedReasons: Map<string, string>;
} {
  const eligibleSet = new Set(eligibleFactIds);
  const authorizedFacts: CareerFact[] = [];
  const unauthorizedReasons = new Map<string, string>();

  for (const fact of facts) {
    if (fact.profileId !== profileId) {
      unauthorizedReasons.set(fact.id, 'foreign_profile');
      continue;
    }
    if (fact.verificationState !== 'confirmed') {
      unauthorizedReasons.set(fact.id, `unconfirmed_state_${fact.verificationState}`);
      continue;
    }
    if (fact.supersededBy) {
      unauthorizedReasons.set(fact.id, 'superseded');
      continue;
    }
    if (!eligibleSet.has(fact.id)) {
      unauthorizedReasons.set(fact.id, 'not_eligible_for_jd');
      continue;
    }
    authorizedFacts.push(fact);
  }

  return { authorizedFacts, unauthorizedReasons };
}

/**
 * Extracts numbers and metric tokens from a text string for hallucination check.
 */
function extractNumericTokens(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?(?:k|m|b|%|x|\+)?\b/gi);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}

/**
 * Checks whether numerical claims in generated text are grounded in source claims.
 */
function areNumericClaimsGrounded(generatedText: string, sourceClaims: string[]): boolean {
  const generatedTokens = extractNumericTokens(generatedText);
  if (generatedTokens.length === 0) return true;

  const combinedSource = sourceClaims.join(' ').toLowerCase();

  for (const token of generatedTokens) {
    // Exact token match (e.g. "40%", "2m", "5")
    if (combinedSource.includes(token)) continue;

    // Check pure digits (e.g. if token is "2m", check if "2" or "2m" or "2 million" is in source)
    const digitsOnly = token.replace(/[^0-9]/g, '');
    if (digitsOnly && combinedSource.includes(digitsOnly)) continue;

    // Token not found in any source fact claim
    return false;
  }

  return true;
}

export interface ValidatedTailoredContent {
  summary?: { text: string; derivedFromFactIds: string[] };
  work: Array<Work & { derivedFromFactIds: string[] }>;
  projects: Array<Project & { derivedFromFactIds: string[] }>;
  skills: Array<Skill & { derivedFromFactIds: string[] }>;
  education: Array<Education & { derivedFromFactIds: string[] }>;
  awards: Array<Award & { derivedFromFactIds: string[] }>;
  usedFactIds: string[];
  issues: TailoringValidationIssue[];
}

/**
 * Validates AI tailoring structured output against authorized facts.
 * Rejects or filters unauthorized fact IDs, missing attributions, and metric hallucinations.
 */
export function validateTailoringAIResponse(
  rawResponse: ResumeTailoringAIResponse,
  authorizedFacts: CareerFact[],
  allProfileFacts: CareerFact[],
  profileId: string
): ValidatedTailoredContent {
  const authorizedMap = new Map<string, CareerFact>(authorizedFacts.map((f) => [f.id, f]));
  const allFactsMap = new Map<string, CareerFact>(allProfileFacts.map((f) => [f.id, f]));

  const issues: TailoringValidationIssue[] = [];
  const usedFactIdSet = new Set<string>();

  const validateFactIds = (
    factIds: string[],
    entityName: string
  ): { validIds: string[]; isValid: boolean } => {
    if (!factIds || factIds.length === 0) {
      issues.push({
        kind: 'missing_attribution',
        detail: `Entity "${entityName}" lacks fact attribution (derivedFromFactIds is empty).`,
        entityName,
      });
      return { validIds: [], isValid: false };
    }

    const validIds: string[] = [];
    let hasInvalid = false;

    for (const fid of factIds) {
      if (authorizedMap.has(fid)) {
        validIds.push(fid);
        usedFactIdSet.add(fid);
        continue;
      }

      hasInvalid = true;
      const existingFact = allFactsMap.get(fid);

      if (!existingFact) {
        issues.push({
          kind: 'unauthorized_fact',
          detail: `Entity "${entityName}" references unknown or unauthorized fact ID: ${fid}`,
          entityName,
          factId: fid,
        });
      } else if (existingFact.profileId !== profileId) {
        issues.push({
          kind: 'foreign_profile_fact',
          detail: `Entity "${entityName}" references fact from another profile: ${fid}`,
          entityName,
          factId: fid,
        });
      } else if (existingFact.supersededBy) {
        issues.push({
          kind: 'superseded_fact',
          detail: `Entity "${entityName}" references superseded fact: ${fid}`,
          entityName,
          factId: fid,
        });
      } else if (existingFact.verificationState !== 'confirmed') {
        issues.push({
          kind: 'unconfirmed_fact',
          detail: `Entity "${entityName}" references unconfirmed fact (${existingFact.verificationState}): ${fid}`,
          entityName,
          factId: fid,
        });
      } else {
        issues.push({
          kind: 'unauthorized_fact',
          detail: `Entity "${entityName}" references fact not eligible for target JD: ${fid}`,
          entityName,
          factId: fid,
        });
      }
    }

    return { validIds, isValid: !hasInvalid && validIds.length > 0 };
  };

  // 1. Validate Summary
  let validatedSummary: { text: string; derivedFromFactIds: string[] } | undefined;
  if (rawResponse.summary && rawResponse.summary.text.trim()) {
    const { validIds, isValid } = validateFactIds(
      rawResponse.summary.derivedFromFactIds,
      'Summary'
    );
    if (isValid) {
      const sourceClaims = validIds.map((id) => authorizedMap.get(id)?.claim || '');
      if (areNumericClaimsGrounded(rawResponse.summary.text, sourceClaims)) {
        validatedSummary = {
          text: rawResponse.summary.text.trim(),
          derivedFromFactIds: validIds,
        };
      } else {
        issues.push({
          kind: 'metric_inflation',
          detail: 'Summary contains numerical or metric claims not present in source facts.',
          entityName: 'Summary',
        });
      }
    }
  }

  // 2. Validate Work
  const validatedWork: Array<Work & { derivedFromFactIds: string[] }> = [];
  for (const w of rawResponse.work || []) {
    const { validIds, isValid } = validateFactIds(
      w.derivedFromFactIds,
      `Work: ${w.name} (${w.position})`
    );
    if (!isValid) continue;

    const sourceClaims = validIds.map((id) => authorizedMap.get(id)?.claim || '');
    const allWorkText = `${w.summary || ''} ${(w.highlights || []).join(' ')}`;

    if (!areNumericClaimsGrounded(allWorkText, sourceClaims)) {
      issues.push({
        kind: 'metric_inflation',
        detail: `Work entry "${w.name}" contains metric claims not supported by source facts.`,
        entityName: w.name,
      });
      continue;
    }

    validatedWork.push({
      name: w.name,
      position: w.position,
      ...(w.startDate ? { startDate: w.startDate } : {}),
      ...(w.endDate ? { endDate: w.endDate } : {}),
      ...(w.summary ? { summary: w.summary } : {}),
      ...(w.highlights && w.highlights.length > 0 ? { highlights: w.highlights } : {}),
      derivedFromFactIds: validIds,
    });
  }

  // 3. Validate Projects
  const validatedProjects: Array<Project & { derivedFromFactIds: string[] }> = [];
  for (const p of rawResponse.projects || []) {
    const { validIds, isValid } = validateFactIds(p.derivedFromFactIds, `Project: ${p.name}`);
    if (!isValid) continue;

    const sourceClaims = validIds.map((id) => authorizedMap.get(id)?.claim || '');
    const allProjText = `${p.description || ''} ${(p.highlights || []).join(' ')}`;

    if (!areNumericClaimsGrounded(allProjText, sourceClaims)) {
      issues.push({
        kind: 'metric_inflation',
        detail: `Project "${p.name}" contains metric claims not supported by source facts.`,
        entityName: p.name,
      });
      continue;
    }

    validatedProjects.push({
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      ...(p.highlights && p.highlights.length > 0 ? { highlights: p.highlights } : {}),
      ...(p.keywords && p.keywords.length > 0 ? { keywords: p.keywords } : {}),
      ...(p.startDate ? { startDate: p.startDate } : {}),
      ...(p.endDate ? { endDate: p.endDate } : {}),
      ...(p.url ? { url: p.url } : {}),
      derivedFromFactIds: validIds,
    });
  }

  // 4. Validate Skills
  const validatedSkills: Array<Skill & { derivedFromFactIds: string[] }> = [];
  for (const s of rawResponse.skills || []) {
    const { validIds, isValid } = validateFactIds(s.derivedFromFactIds, `Skill: ${s.name}`);
    if (!isValid) continue;

    const sourceClaims = validIds.map((id) => authorizedMap.get(id)?.claim || '');
    const allSkillText = `${s.name || ''} ${s.level || ''} ${(s.keywords || []).join(' ')}`;

    if (!areNumericClaimsGrounded(allSkillText, sourceClaims)) {
      issues.push({
        kind: 'metric_inflation',
        detail: `Skill "${s.name}" contains metric claims not supported by source facts.`,
        entityName: s.name,
      });
      continue;
    }

    validatedSkills.push({
      name: s.name,
      ...(s.level ? { level: s.level } : {}),
      ...(s.keywords && s.keywords.length > 0 ? { keywords: s.keywords } : {}),
      derivedFromFactIds: validIds,
    });
  }

  // 5. Validate Education
  const validatedEducation: Array<Education & { derivedFromFactIds: string[] }> = [];
  for (const e of rawResponse.education || []) {
    const { validIds, isValid } = validateFactIds(
      e.derivedFromFactIds,
      `Education: ${e.institution}`
    );
    if (!isValid) continue;

    const sourceClaims = validIds.map((id) => authorizedMap.get(id)?.claim || '');
    const allEduText = `${e.institution || ''} ${e.area || ''} ${e.studyType || ''} ${e.score || ''}`;

    if (!areNumericClaimsGrounded(allEduText, sourceClaims)) {
      issues.push({
        kind: 'metric_inflation',
        detail: `Education "${e.institution}" contains metric claims not supported by source facts.`,
        entityName: e.institution,
      });
      continue;
    }

    validatedEducation.push({
      institution: e.institution,
      area: e.area || '',
      studyType: e.studyType || '',
      ...(e.startDate ? { startDate: e.startDate } : {}),
      ...(e.endDate ? { endDate: e.endDate } : {}),
      ...(e.score ? { score: e.score } : {}),
      derivedFromFactIds: validIds,
    });
  }

  // 6. Validate Awards
  const validatedAwards: Array<Award & { derivedFromFactIds: string[] }> = [];
  for (const a of rawResponse.awards || []) {
    const { validIds, isValid } = validateFactIds(a.derivedFromFactIds, `Award: ${a.title}`);
    if (!isValid) continue;

    const sourceClaims = validIds.map((id) => authorizedMap.get(id)?.claim || '');
    const allAwardText = `${a.title || ''} ${a.awarder || ''} ${a.summary || ''}`;

    if (!areNumericClaimsGrounded(allAwardText, sourceClaims)) {
      issues.push({
        kind: 'metric_inflation',
        detail: `Award "${a.title}" contains metric claims not supported by source facts.`,
        entityName: a.title,
      });
      continue;
    }

    validatedAwards.push({
      title: a.title,
      ...(a.awarder ? { awarder: a.awarder } : {}),
      ...(a.date ? { date: a.date } : {}),
      ...(a.summary ? { summary: a.summary } : {}),
      derivedFromFactIds: validIds,
    });
  }

  return {
    summary: validatedSummary,
    work: validatedWork,
    projects: validatedProjects,
    skills: validatedSkills,
    education: validatedEducation,
    awards: validatedAwards,
    usedFactIds: Array.from(usedFactIdSet),
    issues,
  };
}

/**
 * Builds the complete attributed ResumeData from validated tailored content and base presentation.
 */
export function buildTailoredResumeData(
  validated: ValidatedTailoredContent,
  baseResume?: ResumeData,
  metadata?: {
    jobId?: string;
    jobTitle?: string;
    company?: string;
    profileId?: string;
  }
): { resumeData: ResumeData; attributions: ProjectionAttribution[] } {
  const base = baseResume
    ? withResumeDefaults(baseResume)
    : withResumeDefaults({
        basics: { name: '', email: '', label: '', summary: '' },
        work: [],
        education: [],
        skills: [],
        projects: [],
      });

  const tailoredBasics = {
    ...base.basics,
    ...(validated.summary?.text
      ? {
          summary: validated.summary.text,
          derivedFromFactIds: validated.summary.derivedFromFactIds,
        }
      : {}),
  };

  const resumeData: ResumeData = {
    ...base,
    basics: tailoredBasics,
    work: validated.work,
    projects: validated.projects,
    skills: validated.skills,
    education: validated.education,
    awards: validated.awards,
    meta: {
      ...(base.meta || {}),
      ...(metadata?.jobId ? { tailoredForJobId: metadata.jobId } : {}),
      ...(metadata?.jobTitle ? { tailoredForJobTitle: metadata.jobTitle } : {}),
      ...(metadata?.company ? { tailoredForJobCompany: metadata.company } : {}),
      ...(metadata?.profileId ? { tailoredFromProfileId: metadata.profileId } : {}),
    },
  };

  // Generate deterministic attributions list
  const attributions: ProjectionAttribution[] = [];

  const addAttributions = (section: string, list: Array<{ derivedFromFactIds?: string[] }>) => {
    list.forEach((item, index) => {
      for (const factId of item.derivedFromFactIds || []) {
        attributions.push({ factId, section, index });
      }
    });
  };

  addAttributions('work', validated.work);
  addAttributions('projects', validated.projects);
  addAttributions('skills', validated.skills);
  addAttributions('education', validated.education);
  addAttributions('awards', validated.awards);
  if (validated.summary?.derivedFromFactIds?.length) {
    for (const factId of validated.summary.derivedFromFactIds) {
      attributions.push({ factId, section: 'basics', index: 0 });
    }
  }

  return { resumeData, attributions };
}

/**
 * Tailors a Resume draft using AI while strictly enforcing the Career Knowledge truth boundary.
 */
export async function tailorResumeWithCareerKnowledge(
  aiService: AIServiceLike | null,
  request: TailorResumeWithCareerKnowledgeRequest,
  allFacts: CareerFact[]
): Promise<TailorResumeWithCareerKnowledgeResult> {
  const {
    profileId,
    jdMatchReport,
    baseResume,
    targetJobDescription,
    targetJobTitle,
    targetCompany,
    additionalInstructions,
  } = request;

  // 1. Determine eligible confirmed fact IDs from Phase 10 match report
  const eligibleFactIds = getEligibleConfirmedFactIds(jdMatchReport);

  // 2. Authorize facts: strictly confirmed, active, profile-matched, eligible
  const { authorizedFacts } = getAuthorizedConfirmedFacts(allFacts, profileId, eligibleFactIds);

  // No authorized facts: do NOT report success with a near-empty resume.
  // The caller must surface this as an error / "confirm knowledge first" state.
  if (authorizedFacts.length === 0) {
    logger.warn(
      'AI tailoring: no authorized facts for JD, aborting instead of emitting empty resume.'
    );
    const fallbackProjection = projectCareerKnowledgeToResume(
      allFacts.filter(
        (f) => f.profileId === profileId && f.verificationState === 'confirmed' && !f.supersededBy
      ),
      { profileId, baseResume }
    );

    return {
      success: false,
      tailoredResumeData: fallbackProjection.resumeData,
      attributions: fallbackProjection.attributions,
      usedFactIds: [],
      fallbackUsed: true,
      validationIssues: [
        {
          kind: 'unauthorized_fact',
          detail:
            'No eligible confirmed facts found matching target JD. Confirm career knowledge first.',
        },
      ],
      error:
        'No eligible confirmed facts found matching target JD. Confirm career knowledge first.',
    };
  }

  // No AI service: deterministic projection over authorized facts is still a success.
  if (!aiService) {
    logger.warn('AI tailoring: no AI service, falling back to deterministic projection.');
    const fallbackProjection = projectCareerKnowledgeToResume(authorizedFacts, {
      profileId,
      baseResume,
    });

    return {
      success: true,
      tailoredResumeData: fallbackProjection.resumeData,
      attributions: fallbackProjection.attributions,
      usedFactIds: fallbackProjection.attributions.map((a) => a.factId),
      fallbackUsed: true,
      validationIssues: [],
    };
  }

  // 3. Build constrained prompt
  const prompt = getCareerKnowledgeResumeTailoringPrompt({
    profileId,
    authorizedFacts,
    jdMatchReport,
    baseResume,
    targetJobDescription,
    targetJobTitle,
    targetCompany,
    ...(additionalInstructions?.trim()
      ? { additionalInstructions: additionalInstructions.trim().slice(0, 2000) }
      : {}),
  });

  const messages = [
    {
      role: 'system' as const,
      content:
        'You are an expert technical resume tailoring engine grounded exclusively in confirmed career facts.',
    },
    { role: 'user' as const, content: prompt },
  ];

  try {
    const rawResponse = await aiService.generateStructured(messages, resumeTailoringAISchema);

    if (!rawResponse) {
      throw new Error('AI returned null or malformed response');
    }

    // 4. Validate output against authorized facts
    const validated = validateTailoringAIResponse(
      rawResponse,
      authorizedFacts,
      allFacts.filter((f) => f.profileId === profileId),
      profileId
    );

    // If all generated sections were rejected due to invalid attribution, fallback
    const totalValidEntities =
      validated.work.length +
      validated.projects.length +
      validated.skills.length +
      validated.education.length +
      validated.awards.length;

    if (totalValidEntities === 0) {
      logger.warn(
        'AI tailoring output contained zero valid attributed entities, using fallback projection.'
      );
      const fallbackProjection = projectCareerKnowledgeToResume(authorizedFacts, {
        profileId,
        baseResume,
      });
      return {
        success: true,
        tailoredResumeData: fallbackProjection.resumeData,
        attributions: fallbackProjection.attributions,
        usedFactIds: fallbackProjection.attributions.map((a) => a.factId),
        fallbackUsed: true,
        validationIssues: validated.issues,
      };
    }

    // 5. Build final tailored resume data with preserved local fields and attributions
    const { resumeData, attributions } = buildTailoredResumeData(validated, baseResume, {
      jobId: jdMatchReport.jdId,
      jobTitle: targetJobTitle,
      company: targetCompany,
      profileId,
    });

    return {
      success: true,
      tailoredResumeData: resumeData,
      attributions,
      usedFactIds: validated.usedFactIds,
      fallbackUsed: false,
      validationIssues: validated.issues,
    };
  } catch (err) {
    logger.error('AI tailoring encountered error, falling back to deterministic projection:', err);

    // Fallback cleanly to Phase 6 projection
    const fallbackProjection = projectCareerKnowledgeToResume(authorizedFacts, {
      profileId,
      baseResume,
    });
    return {
      success: true,
      tailoredResumeData: fallbackProjection.resumeData,
      attributions: fallbackProjection.attributions,
      usedFactIds: fallbackProjection.attributions.map((a) => a.factId),
      fallbackUsed: true,
      validationIssues: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Creates a persistable Resume record from a tailored result.
 * Never mutates original Resume.
 */
export function createTailoredResumeDraftRow(
  tailoredData: ResumeData,
  fileName: string = 'Tailored Resume.json'
): {
  createdAt: number;
  updatedAt: number;
  fileName: string;
  rawText: string;
  parsedData: ResumeData;
  formatted: boolean;
  isMain: boolean;
} {
  return {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fileName,
    rawText: JSON.stringify(tailoredData),
    parsedData: tailoredData,
    formatted: true,
    isMain: false,
  };
}
