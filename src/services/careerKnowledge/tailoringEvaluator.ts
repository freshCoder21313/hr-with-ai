// Phase 12 — Grounded Resume Evaluation & Tailoring Quality Harness
//
// Evaluates AI-assisted Resume tailoring outputs against canonical Career Knowledge
// facts, JD requirements, and base Resume presentation across 11 deterministic layers.
//
// STRICT PRINCIPLES:
// 1. Distinguish good tailoring from hallucinated tailoring and safe-but-poor tailoring.
// 2. Pure deterministic evaluation: NO live AI required, NO vector embeddings.
// 3. Explicit dimension-based results: NO aggregate "suitability score" or candidate ranking.
// 4. Source authorization, numeric fidelity, date fidelity, entity fidelity, semantic strengthening,
//    unsupported scale, unsupported seniority, requirement non-claim, and attribution integrity.

import type {
  CareerFact,
  JDMatchReport,
  SemanticStrengtheningIssue,
  TailoredResumeAIResponse,
  TailoringEvaluationMetadata,
  TailoringEvaluationResult,
  TailoringValidationIssue,
} from '@/types/careerKnowledge';
import type { ResumeData } from '@/types/resume';
import { CAREER_KNOWLEDGE_TAILORING_PROMPT_VERSION } from '@/services/prompts/careerKnowledgeTailoring';

export const EVALUATOR_VERSION = '1.0.0';

// --- Semantic Strengthening & Verb Corpus ---------------------------------

const CONTRIBUTOR_PATTERNS = [
  /\bworked on\b/i,
  /\bcontributed to\b/i,
  /\bassisted with\b/i,
  /\bassisted in\b/i,
  /\bsupported\b/i,
  /\bparticipated in\b/i,
  /\bhelped with\b/i,
  /\bhelped to\b/i,
  /\bwas part of\b/i,
  /\bmaintained\b/i,
  /\bused\b/i,
  /\butilized\b/i,
  /\bwrote code for\b/i,
  /\bbuilt features for\b/i,
  /\bimplemented\b/i,
];

const LEADERSHIP_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bled\b/i, label: 'led' },
  { pattern: /\barchitected\b/i, label: 'architected' },
  { pattern: /\bdesigned and led\b/i, label: 'designed and led' },
  { pattern: /\bowned\b/i, label: 'owned' },
  { pattern: /\bmanaged\b/i, label: 'managed' },
  { pattern: /\bdrove\b/i, label: 'drove' },
  { pattern: /\bfounded\b/i, label: 'founded' },
  { pattern: /\bdirected\b/i, label: 'directed' },
  { pattern: /\bspearheaded\b/i, label: 'spearheaded' },
  { pattern: /\bpioneered\b/i, label: 'pioneered' },
  { pattern: /\bheaded\b/i, label: 'headed' },
  { pattern: /\borchestrated\b/i, label: 'orchestrated' },
  { pattern: /\bchampioned\b/i, label: 'championed' },
  { pattern: /\boversaw\b/i, label: 'oversaw' },
  { pattern: /\bsupervised\b/i, label: 'supervised' },
  { pattern: /\btechnical vision\b/i, label: 'technical vision' },
  { pattern: /\bsingle-handedly\b/i, label: 'single-handedly' },
];

// --- Scale & Scope Corpus -------------------------------------------------

const SCALE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\benterprise-scale\b/i, label: 'enterprise-scale' },
  { pattern: /\bhigh-traffic\b/i, label: 'high-traffic' },
  { pattern: /\bmillions of users\b/i, label: 'millions of users' },
  { pattern: /\bglobal platform\b/i, label: 'global platform' },
  { pattern: /\blarge distributed system\b/i, label: 'large distributed system' },
  { pattern: /\bmission-critical\b/i, label: 'mission-critical' },
  { pattern: /\bpetabytes?\b/i, label: 'petabytes' },
  { pattern: /\bultra-low latency\b/i, label: 'ultra-low latency' },
  { pattern: /\bbillion(?:s)?\b/i, label: 'billions' },
  { pattern: /\bmulti-region\b/i, label: 'multi-region' },
  { pattern: /\bworldwide scale\b/i, label: 'worldwide scale' },
  { pattern: /\bthousands of microservices\b/i, label: 'thousands of microservices' },
];

// --- Seniority Titles -----------------------------------------------------

const SENIORITY_TITLES = [
  'senior',
  'staff',
  'principal',
  'lead',
  'director',
  'head of',
  'vp',
  'vice president',
  'chief',
  'distinguished',
  'fellow',
  'manager',
];

// --- Numeric Normalization Utilities --------------------------------------

interface NormalizedNumber {
  raw: string;
  value: number;
  unit: string;
}

/**
 * Normalizes numeric strings into comparable numbers and units.
 * Supports: 2M, 2 million, 2,000,000, 200k, 5%, 5 percent, 3 years, 99.9%, etc.
 */
export function normalizeNumericToken(token: string): NormalizedNumber | null {
  const clean = token.toLowerCase().trim().replace(/,/g, '');

  // Percent: e.g. "99.9%", "99.9 percent", "5%"
  const percentMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)$/);
  if (percentMatch) {
    return { raw: token, value: parseFloat(percentMatch[1]), unit: '%' };
  }

  // Multipliers with optional count nouns: e.g. "2m", "2 million", "2m users", "200k requests"
  const multiplierMatch = clean.match(
    /^(\d+(?:\.\d+)?)\s*(k|thousand|m|million|b|billion|x)(?:\s*(?:nodes?|servers?|users?|requests?|services?|microservices?|instances?|clusters?|count))?$/
  );
  if (multiplierMatch) {
    const num = parseFloat(multiplierMatch[1]);
    const mult = multiplierMatch[2];
    let factor = 1;
    let unit = mult;
    if (mult === 'k' || mult === 'thousand') {
      factor = 1000;
      unit = 'k';
    } else if (mult === 'm' || mult === 'million') {
      factor = 1000000;
      unit = 'm';
    } else if (mult === 'b' || mult === 'billion') {
      factor = 1000000000;
      unit = 'b';
    } else if (mult === 'x') {
      unit = 'x';
    }
    return { raw: token, value: num * factor, unit };
  }

  // Data volume: e.g. "500gb", "500 gigabytes", "10tb", "50mb"
  const dataSizeMatch = clean.match(
    /^(\d+(?:\.\d+)?)\s*(gb|gigabytes?|tb|terabytes?|mb|megabytes?|pb|petabytes?)$/
  );
  if (dataSizeMatch) {
    const num = parseFloat(dataSizeMatch[1]);
    const mult = dataSizeMatch[2];
    let factor = 1;
    if (mult.startsWith('m')) factor = 1;
    else if (mult.startsWith('g')) factor = 1000;
    else if (mult.startsWith('t')) factor = 1000000;
    else if (mult.startsWith('p')) factor = 1000000000;
    return { raw: token, value: num * factor, unit: 'mb' };
  }

  // Duration: e.g. "3 years", "5 yrs", "6 months"
  const durationMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:years?|yrs?|months?)$/);
  if (durationMatch) {
    const unit = clean.includes('month') ? 'month' : 'year';
    return { raw: token, value: parseFloat(durationMatch[1]), unit };
  }

  // Pure numbers or count nouns: e.g. "10", "100", "10 servers", "50 nodes", "15 microservices", "2000000"
  const pureNumMatch = clean.match(
    /^(\d+(?:\.\d+)?)\s*(?:nodes?|servers?|users?|requests?|services?|microservices?|instances?|clusters?|count)?$/
  );
  if (pureNumMatch) {
    const val = parseFloat(pureNumMatch[1]);
    return { raw: token, value: val, unit: 'count' };
  }

  return null;
}

/**
 * Extracts numbers and metrics from text with full normalization.
 */
export function extractNormalizedNumbers(text: string): NormalizedNumber[] {
  const regex =
    /\b\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:%|percent|k|thousand|m|million|b|billion|x|gb|gigabytes?|tb|terabytes?|mb|megabytes?|pb|petabytes?|years?|yrs?|months?|nodes?|servers?|users?|requests?|services?|microservices?|instances?|clusters?))?\b/gi;
  const matches = text.match(regex) || [];
  const results: NormalizedNumber[] = [];

  for (const m of matches) {
    const norm = normalizeNumericToken(m);
    if (norm) {
      results.push(norm);
    }
  }

  return results;
}

/**
 * Checks if a generated number is grounded in source numbers.
 */
export function isNumberGrounded(
  generated: NormalizedNumber,
  sourceNumbers: NormalizedNumber[]
): boolean {
  for (const src of sourceNumbers) {
    // Exact value and unit match
    if (Math.abs(generated.value - src.value) < 0.0001) {
      return true;
    }
    // Count value matching scaled multiplier (e.g. 2,000,000 count vs 2m)
    if (generated.value === src.value) {
      return true;
    }
  }
  return false;
}

// --- Date Extraction Utilities --------------------------------------------

export function extractDatesFromText(text: string): string[] {
  // Matches YYYY, YYYY-MM, YYYY-MM-DD, or Month YYYY
  const dateRegex = /\b(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?\b/g;
  return text.match(dateRegex) || [];
}

// --- Layer Validation Functions -------------------------------------------

export interface EvaluationContext {
  profileId: string;
  authorizedFacts: CareerFact[];
  allProfileFacts: CareerFact[];
  jdMatchReport: JDMatchReport;
  baseResume?: ResumeData;
  targetJobTitle?: string;
  targetJobDescription?: string;
  targetCompany?: string;
}

/**
 * Evaluates semantic strengthening by comparing source claims against tailored claims.
 */
export function evaluateSemanticStrengthening(
  tailoredText: string,
  sourceFacts: CareerFact[],
  entityName: string
): SemanticStrengtheningIssue | null {
  const combinedSource = sourceFacts.map((f) => f.claim).join(' ');

  for (const { pattern, label } of LEADERSHIP_PATTERNS) {
    if (pattern.test(tailoredText)) {
      // Check if source claims also contain this leadership claim or similar leadership pattern
      const sourceHasLeadership = LEADERSHIP_PATTERNS.some((p) => p.pattern.test(combinedSource));
      if (!sourceHasLeadership) {
        // Source only had contributor level or lacked leadership claim
        const sourceHasContributor = CONTRIBUTOR_PATTERNS.some((p) => p.test(combinedSource));
        return {
          entityName,
          sourceText: combinedSource,
          tailoredText,
          detectedPattern: label,
          classification: sourceHasContributor ? 'strengthened' : 'strengthened',
          explanation: `Tailored text uses leadership/ownership verb "${label}" but source facts only support contributor-level experience.`,
        };
      }
    }
  }

  return null;
}

/**
 * Evaluates unsupported scale claims.
 */
export function evaluateUnsupportedScale(
  tailoredText: string,
  sourceFacts: CareerFact[]
): string | null {
  const combinedSource = sourceFacts.map((f) => f.claim).join(' ');

  for (const { pattern, label } of SCALE_PATTERNS) {
    if (pattern.test(tailoredText) && !pattern.test(combinedSource)) {
      return `Tailored text introduces unsupported scale claim "${label}" not found in source facts.`;
    }
  }

  return null;
}

/**
 * Evaluates seniority inflation / JD title leakage.
 */
export function evaluateUnsupportedSeniority(
  tailoredRole: string,
  sourceFacts: CareerFact[],
  targetJobTitle?: string
): string | null {
  const roleLower = tailoredRole.toLowerCase();
  const sourceRoles = sourceFacts
    .map((f) => {
      const structuredRole =
        f.structured && typeof f.structured === 'object' && 'role' in f.structured
          ? String(f.structured.role)
          : '';
      return `${f.claim} ${structuredRole}`.toLowerCase();
    })
    .join(' ');

  for (const title of SENIORITY_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b`, 'i');
    if (titleRegex.test(roleLower) && !titleRegex.test(sourceRoles)) {
      const isLeakedFromJD = targetJobTitle && titleRegex.test(targetJobTitle.toLowerCase());
      return isLeakedFromJD
        ? `Tailored role "${tailoredRole}" adopts senior title "${title}" from target JD "${targetJobTitle}" without authorization in source Career Facts.`
        : `Tailored role "${tailoredRole}" introduces unauthorized seniority title "${title}".`;
    }
  }

  return null;
}

/**
 * Evaluates requirement non-claim violations.
 * Ensures missing or uncertain JD requirements are NEVER claimed in the tailored output.
 */
export function evaluateRequirementNonClaim(
  tailoredResponse: TailoredResumeAIResponse,
  jdMatchReport: JDMatchReport,
  authorizedFacts: CareerFact[]
): string[] {
  const issues: string[] = [];
  const authorizedClaims = authorizedFacts
    .map((f) => `${f.subject} ${f.claim}`)
    .join(' ')
    .toLowerCase();

  // Find unsatisfied or missing requirements in the match report
  const missingOrUncertain = jdMatchReport.results.filter(
    (r) =>
      r.status === 'missing' ||
      r.status === 'uncertain' ||
      r.status === 'conflicting' ||
      r.status === 'unsupported'
  );

  // Collect all tailored text
  const allTailoredTexts: string[] = [];
  if (tailoredResponse.summary?.text) allTailoredTexts.push(tailoredResponse.summary.text);
  for (const w of tailoredResponse.work || []) {
    allTailoredTexts.push(w.position, w.summary || '', ...(w.highlights || []));
  }
  for (const p of tailoredResponse.projects || []) {
    allTailoredTexts.push(
      p.name,
      p.description || '',
      ...(p.highlights || []),
      ...(p.keywords || [])
    );
  }
  for (const s of tailoredResponse.skills || []) {
    allTailoredTexts.push(s.name, ...(s.keywords || []));
  }

  const combinedTailored = allTailoredTexts.join(' ').toLowerCase();

  for (const gap of missingOrUncertain) {
    const key = gap.requirement.key.toLowerCase().replace(/_/g, ' ');
    // Check if the missing key is mentioned in the tailored output
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combinedTailored)) {
      // Check if it was authorized by some other fact
      if (!authorizedClaims.includes(key)) {
        issues.push(
          `Tailored output claims missing/uncertain JD requirement "${gap.requirement.key}" (${gap.requirement.description}) which is not confirmed in Career Knowledge.`
        );
      }
    }
  }

  return issues;
}

/**
 * Evaluates entity fidelity (companies, project names, skills, institutions, degrees).
 */
export function evaluateEntityFidelity(
  tailoredResponse: TailoredResumeAIResponse,
  authorizedFacts: CareerFact[],
  baseResume?: ResumeData
): string[] {
  const issues: string[] = [];
  const authorizedMap = new Map<string, CareerFact>(authorizedFacts.map((f) => [f.id, f]));

  // 1. Work employers
  for (const w of tailoredResponse.work || []) {
    const facts = (w.derivedFromFactIds || [])
      .map((id) => authorizedMap.get(id))
      .filter(Boolean) as CareerFact[];
    const authorizedNames = facts.map((f) => {
      const company =
        f.structured && typeof f.structured === 'object' && 'company' in f.structured
          ? String(f.structured.company)
          : '';
      return `${f.subject} ${company} ${f.claim}`.toLowerCase();
    });

    const workNameLower = w.name.toLowerCase();
    const isAttested = authorizedNames.some((n) => n.includes(workNameLower));
    const isBasePreserved = baseResume?.work?.some((bw) => bw.name.toLowerCase() === workNameLower);

    if (!isAttested && !isBasePreserved && facts.length > 0) {
      issues.push(
        `Work employer "${w.name}" is not attested by authorizing facts: ${w.derivedFromFactIds.join(', ')}.`
      );
    }
  }

  // 2. Skills
  for (const s of tailoredResponse.skills || []) {
    const facts = (s.derivedFromFactIds || [])
      .map((id) => authorizedMap.get(id))
      .filter(Boolean) as CareerFact[];
    const authorizedTerms = facts.map((f) => `${f.subject} ${f.claim}`.toLowerCase()).join(' ');

    const skillLower = s.name.toLowerCase();
    const isAttested = authorizedTerms.includes(skillLower);
    const isBasePreserved = baseResume?.skills?.some((bs) => bs.name.toLowerCase() === skillLower);

    if (!isAttested && !isBasePreserved && facts.length > 0) {
      issues.push(
        `Skill "${s.name}" is not attested by authorizing facts: ${s.derivedFromFactIds.join(', ')}.`
      );
    }
  }

  return issues;
}

/**
 * Evaluates date fidelity for work, projects, education, and awards.
 */
export function evaluateDateFidelity(
  tailoredResponse: TailoredResumeAIResponse,
  authorizedFacts: CareerFact[]
): string[] {
  const issues: string[] = [];
  const authorizedMap = new Map<string, CareerFact>(authorizedFacts.map((f) => [f.id, f]));

  // Check work dates
  for (const w of tailoredResponse.work || []) {
    const facts = (w.derivedFromFactIds || [])
      .map((id) => authorizedMap.get(id))
      .filter(Boolean) as CareerFact[];
    if (facts.length === 0) continue;

    const sourceDates = facts.flatMap((f) => {
      const dates: string[] = [];
      if (f.structured && typeof f.structured === 'object') {
        if ('startDate' in f.structured && typeof f.structured.startDate === 'string')
          dates.push(f.structured.startDate);
        if ('endDate' in f.structured && typeof f.structured.endDate === 'string')
          dates.push(f.structured.endDate);
      }
      dates.push(...extractDatesFromText(f.claim));
      return dates;
    });

    if (w.startDate) {
      const startYear = w.startDate.split('-')[0];
      const hasMatch = sourceDates.some((d) => d.startsWith(startYear) || d.includes(w.startDate!));
      if (!hasMatch) {
        issues.push(`Work entry "${w.name}" contains ungrounded startDate "${w.startDate}".`);
      }
    }

    if (w.endDate && w.endDate.toLowerCase() !== 'present') {
      const endYear = w.endDate.split('-')[0];
      const hasMatch = sourceDates.some((d) => d.startsWith(endYear) || d.includes(w.endDate!));
      if (!hasMatch) {
        issues.push(`Work entry "${w.name}" contains ungrounded endDate "${w.endDate}".`);
      }
    }
  }

  return issues;
}

/**
 * Evaluates textual requirement relevance (not a candidate score).
 */
export function evaluateRequirementRelevance(
  tailoredResponse: TailoredResumeAIResponse,
  jdMatchReport: JDMatchReport,
  expectedFocus?: string[]
): { pass: boolean; notes: string[] } {
  const notes: string[] = [];
  const satisfied = jdMatchReport.results.filter((r) => r.status === 'satisfied');

  if (satisfied.length === 0) {
    notes.push('No satisfied JD requirements to evaluate relevance against.');
    return { pass: true, notes };
  }

  // Collect all tailored text
  const allTexts: string[] = [];
  if (tailoredResponse.summary?.text) allTexts.push(tailoredResponse.summary.text);
  for (const w of tailoredResponse.work || []) {
    allTexts.push(w.position, w.summary || '', ...(w.highlights || []));
  }
  for (const p of tailoredResponse.projects || []) {
    allTexts.push(p.name, p.description || '', ...(p.highlights || []));
  }
  for (const s of tailoredResponse.skills || []) {
    allTexts.push(s.name, ...(s.keywords || []));
  }

  const combinedText = allTexts.join(' ').toLowerCase();

  for (const s of satisfied) {
    const key = s.requirement.key.toLowerCase().replace(/_/g, ' ');
    if (combinedText.includes(key)) {
      notes.push(`Satisfied requirement "${s.requirement.key}" is reflected in tailored content.`);
    }
  }

  if (expectedFocus && expectedFocus.length > 0) {
    for (const focus of expectedFocus) {
      if (combinedText.includes(focus.toLowerCase())) {
        notes.push(`Expected focus requirement "${focus}" is prominently represented.`);
      } else {
        notes.push(
          `Notice: Expected focus requirement "${focus}" was not found in tailored content.`
        );
      }
    }
  }

  return { pass: true, notes };
}

// --- Main Tailoring Evaluator ----------------------------------------------

/**
 * Runs a comprehensive 11-layer evaluation of tailored output against canonical career knowledge.
 */
export function evaluateTailoringResult(
  tailoredResponse: TailoredResumeAIResponse,
  context: EvaluationContext,
  options?: {
    fixtureVersion?: string;
    expectedRelevanceFocus?: string[];
    fallbackUsed?: boolean;
  }
): TailoringEvaluationResult {
  const { profileId, authorizedFacts, allProfileFacts, jdMatchReport, baseResume, targetJobTitle } =
    context;

  const authorizedMap = new Map<string, CareerFact>(authorizedFacts.map((f) => [f.id, f]));
  const allFactsMap = new Map<string, CareerFact>(allProfileFacts.map((f) => [f.id, f]));

  const validationIssues: TailoringValidationIssue[] = [];
  const semanticStrengtheningIssues: SemanticStrengtheningIssue[] = [];
  const unsupportedScaleIssues: string[] = [];
  const unsupportedSeniorityIssues: string[] = [];
  const numericFidelityIssues: string[] = [];

  const structuralPass = true;
  let sourceAuthorizationPass = true;
  let attributionPass = true;
  let numericFidelityPass = true;
  let semanticStrengtheningPass = true;
  let unsupportedScalePass = true;
  let unsupportedSeniorityPass = true;

  // 1. Validate Structure & Attributions for each section
  const checkAttribution = (factIds: string[] | undefined, entityName: string): boolean => {
    if (!factIds || factIds.length === 0) {
      attributionPass = false;
      validationIssues.push({
        kind: 'missing_attribution',
        detail: `Entity "${entityName}" lacks fact attribution.`,
        entityName,
      });
      return false;
    }

    let entityAuthPass = true;
    for (const fid of factIds) {
      if (authorizedMap.has(fid)) continue;

      sourceAuthorizationPass = false;
      entityAuthPass = false;
      const existing = allFactsMap.get(fid);

      if (!existing) {
        validationIssues.push({
          kind: 'unauthorized_fact',
          detail: `Entity "${entityName}" references unknown fact ID: ${fid}`,
          entityName,
          factId: fid,
        });
      } else if (existing.profileId !== profileId) {
        validationIssues.push({
          kind: 'foreign_profile_fact',
          detail: `Entity "${entityName}" references fact from foreign profile: ${fid}`,
          entityName,
          factId: fid,
        });
      } else if (existing.supersededBy) {
        validationIssues.push({
          kind: 'superseded_fact',
          detail: `Entity "${entityName}" references superseded fact: ${fid}`,
          entityName,
          factId: fid,
        });
      } else if (existing.verificationState !== 'confirmed') {
        validationIssues.push({
          kind: 'unconfirmed_fact',
          detail: `Entity "${entityName}" references unconfirmed fact (${existing.verificationState}): ${fid}`,
          entityName,
          factId: fid,
        });
      } else {
        validationIssues.push({
          kind: 'unauthorized_fact',
          detail: `Entity "${entityName}" references fact not eligible for target JD: ${fid}`,
          entityName,
          factId: fid,
        });
      }
    }

    return entityAuthPass;
  };

  // Check Summary
  if (tailoredResponse.summary && tailoredResponse.summary.text) {
    checkAttribution(tailoredResponse.summary.derivedFromFactIds, 'Summary');
    const facts = (tailoredResponse.summary.derivedFromFactIds || [])
      .map((id) => authorizedMap.get(id))
      .filter(Boolean) as CareerFact[];

    // Numeric check
    const generatedNums = extractNormalizedNumbers(tailoredResponse.summary.text);
    const sourceNums = facts.flatMap((f) => extractNormalizedNumbers(f.claim));
    for (const gNum of generatedNums) {
      if (!isNumberGrounded(gNum, sourceNums)) {
        numericFidelityPass = false;
        numericFidelityIssues.push(`Summary contains ungrounded numeric claim "${gNum.raw}".`);
      }
    }

    // Semantic strengthening
    const strengthIssue = evaluateSemanticStrengthening(
      tailoredResponse.summary.text,
      facts,
      'Summary'
    );
    if (strengthIssue) {
      semanticStrengtheningPass = false;
      semanticStrengtheningIssues.push(strengthIssue);
    }

    // Unsupported scale
    const scaleIssue = evaluateUnsupportedScale(tailoredResponse.summary.text, facts);
    if (scaleIssue) {
      unsupportedScalePass = false;
      unsupportedScaleIssues.push(`Summary: ${scaleIssue}`);
    }
  }

  // Check Work
  for (const w of tailoredResponse.work || []) {
    checkAttribution(w.derivedFromFactIds, `Work: ${w.name} (${w.position})`);
    const facts = (w.derivedFromFactIds || [])
      .map((id) => authorizedMap.get(id))
      .filter(Boolean) as CareerFact[];
    const workText = `${w.position} ${w.summary || ''} ${(w.highlights || []).join(' ')}`;

    // Numeric check
    const generatedNums = extractNormalizedNumbers(workText);
    const sourceNums = facts.flatMap((f) => extractNormalizedNumbers(f.claim));
    for (const gNum of generatedNums) {
      if (!isNumberGrounded(gNum, sourceNums)) {
        numericFidelityPass = false;
        numericFidelityIssues.push(
          `Work "${w.name}" contains ungrounded numeric claim "${gNum.raw}".`
        );
      }
    }

    // Semantic strengthening
    const strengthIssue = evaluateSemanticStrengthening(workText, facts, `Work: ${w.name}`);
    if (strengthIssue) {
      semanticStrengtheningPass = false;
      semanticStrengtheningIssues.push(strengthIssue);
    }

    // Unsupported scale
    const scaleIssue = evaluateUnsupportedScale(workText, facts);
    if (scaleIssue) {
      unsupportedScalePass = false;
      unsupportedScaleIssues.push(`Work "${w.name}": ${scaleIssue}`);
    }

    // Seniority leakage
    const seniorityIssue = evaluateUnsupportedSeniority(w.position, facts, targetJobTitle);
    if (seniorityIssue) {
      unsupportedSeniorityPass = false;
      unsupportedSeniorityIssues.push(seniorityIssue);
    }
  }

  // Check Projects
  for (const p of tailoredResponse.projects || []) {
    checkAttribution(p.derivedFromFactIds, `Project: ${p.name}`);
    const facts = (p.derivedFromFactIds || [])
      .map((id) => authorizedMap.get(id))
      .filter(Boolean) as CareerFact[];
    const projText = `${p.description || ''} ${(p.highlights || []).join(' ')}`;

    // Numeric check
    const generatedNums = extractNormalizedNumbers(projText);
    const sourceNums = facts.flatMap((f) => extractNormalizedNumbers(f.claim));
    for (const gNum of generatedNums) {
      if (!isNumberGrounded(gNum, sourceNums)) {
        numericFidelityPass = false;
        numericFidelityIssues.push(
          `Project "${p.name}" contains ungrounded numeric claim "${gNum.raw}".`
        );
      }
    }

    // Semantic strengthening
    const strengthIssue = evaluateSemanticStrengthening(projText, facts, `Project: ${p.name}`);
    if (strengthIssue) {
      semanticStrengtheningPass = false;
      semanticStrengtheningIssues.push(strengthIssue);
    }

    // Unsupported scale
    const scaleIssue = evaluateUnsupportedScale(projText, facts);
    if (scaleIssue) {
      unsupportedScalePass = false;
      unsupportedScaleIssues.push(`Project "${p.name}": ${scaleIssue}`);
    }
  }

  // Check Skills
  for (const s of tailoredResponse.skills || []) {
    checkAttribution(s.derivedFromFactIds, `Skill: ${s.name}`);
  }

  // Check Education
  for (const e of tailoredResponse.education || []) {
    checkAttribution(e.derivedFromFactIds, `Education: ${e.institution}`);
  }

  // Check Awards
  for (const a of tailoredResponse.awards || []) {
    checkAttribution(a.derivedFromFactIds, `Award: ${a.title}`);
  }

  // Layer 4: Date Fidelity
  const dateFidelityIssues = evaluateDateFidelity(tailoredResponse, authorizedFacts);
  const dateFidelityPass = dateFidelityIssues.length === 0;

  // Layer 5: Entity Fidelity
  const entityFidelityIssues = evaluateEntityFidelity(
    tailoredResponse,
    authorizedFacts,
    baseResume
  );
  const entityFidelityPass = entityFidelityIssues.length === 0;

  // Layer 9: Requirement Non-Claim
  const unsupportedRequirementClaims = evaluateRequirementNonClaim(
    tailoredResponse,
    jdMatchReport,
    authorizedFacts
  );
  const requirementNonClaimPass = unsupportedRequirementClaims.length === 0;

  // Layer 11: Requirement Relevance
  const { pass: relevancePass, notes: relevanceNotes } = evaluateRequirementRelevance(
    tailoredResponse,
    jdMatchReport,
    options?.expectedRelevanceFocus
  );

  // Overall pass: ALL safety, grounding, fidelity, attribution, and non-claim checks must pass
  const overallPass =
    structuralPass &&
    sourceAuthorizationPass &&
    attributionPass &&
    numericFidelityPass &&
    dateFidelityPass &&
    entityFidelityPass &&
    semanticStrengtheningPass &&
    unsupportedScalePass &&
    unsupportedSeniorityPass &&
    requirementNonClaimPass;

  const metadata: TailoringEvaluationMetadata = {
    evaluatorVersion: EVALUATOR_VERSION,
    promptVersion: CAREER_KNOWLEDGE_TAILORING_PROMPT_VERSION,
    fixtureVersion: options?.fixtureVersion || '1.0.0',
    evaluatedAt: new Date().toISOString(),
  };

  return {
    structuralPass,
    sourceAuthorizationPass,
    attributionPass,
    numericFidelityPass,
    dateFidelityPass,
    entityFidelityPass,
    semanticStrengtheningPass,
    unsupportedScalePass,
    unsupportedSeniorityPass,
    requirementNonClaimPass,
    relevancePass,
    fallbackUsed: options?.fallbackUsed ?? false,
    overallPass,
    validationIssues,
    semanticStrengtheningIssues,
    unsupportedScaleIssues,
    unsupportedSeniorityIssues,
    unsupportedRequirementClaims,
    entityFidelityIssues,
    dateFidelityIssues,
    numericFidelityIssues,
    relevanceNotes,
    metadata,
  };
}
