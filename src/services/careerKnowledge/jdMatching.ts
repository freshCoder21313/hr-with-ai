// Career Knowledge JD Requirements & Deterministic Matching (Phase 10).
//
// Transforms a Job Description into normalized, atomic requirements and compares
// them deterministically against canonical Career Knowledge claims.
//
// STRICT INVARIANTS:
// 1. Matching is factual information retrieval and evidence mapping.
// 2. NO suitability scoring, candidate rankings, or hiring predictions.
// 3. Evidence alone NEVER confirms or satisfies a requirement.
// 4. Strict profile isolation.
// 5. Verification state is respected: confirmed -> satisfied, unconfirmed -> uncertain, rejected -> missing.
// 6. Rejected and superseded facts do not satisfy requirements.
// 7. Deterministic and repeatable without vector/fuzzy hallucinations.
//
// Dependency direction: services -> lib / types.

import type {
  CareerEvidence,
  CareerFact,
  FactEvidenceLink,
  JDMatchReport,
  JDMatchSummary,
  JDRequirement,
  JDRequirementCategory,
  JDRequirementImportance,
  KnowledgeGap,
  KnowledgeRequirement,
  RequirementMatchResult,
} from '@/types/careerKnowledge';
import type { ParsedJobData } from '@/services/jobs/jdParser';
import { parseRawJobDescription } from '@/services/jobs/jdParser';
import { jdRequirementExtractionSchema } from '@/services/careerKnowledge/schemas';
import { getExtractJDRequirementsPrompt } from '@/services/prompts/jobs';
import type { AIServiceLike } from '@/services/careerKnowledge/questionEngine';
import { detectKnowledgeGaps, isRequirementMatch } from '@/services/careerKnowledge/questionEngine';
import {
  stableStringify,
  areStructuredEqual,
  areFactsContradictory,
} from '@/services/careerKnowledge/structuredEquality';

// Re-exported for backward compatibility (previously defined in this module).
export { stableStringify, areStructuredEqual, areFactsContradictory };

// --- Requirement Key & ID Normalization -----------------------------------

/**
 * Normalizes a raw requirement key into a consistent lower_snake_case token.
 */
export function normalizeRequirementKey(rawKey: string): string {
  if (!rawKey) return 'unspecified_requirement';
  const normalized = rawKey
    .trim()
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/^\.net\b/g, 'dotnet')
    .replace(/[^a-z0-9_.]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'unspecified_requirement';
}

/**
 * Strips the `__N` disambiguation suffix added during extraction when two
 * requirements normalize to the same key. The suffix keeps `id`s unique but
 * must never participate in fact matching — `react__2` should match the same
 * facts as `react`.
 */
export function stripRequirementKeySuffix(key: string): string {
  return key.replace(/__\d+$/, '');
}

/**
 * Creates a deterministic, stable identifier for a JD requirement within its context.
 * Never relies on array indices.
 */
export function generateRequirementId(jdContext: string | undefined, rawKey: string): string {
  const cleanContext =
    (jdContext || 'jd')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'jd';
  const cleanKey = normalizeRequirementKey(rawKey);
  return `req:${cleanContext}:${cleanKey}`;
}

// --- Heuristic & AI Extraction --------------------------------------------

/**
 * Deterministically extracts structured JD requirements from parsed job data without AI calls.
 */
export function extractJDRequirementsFromParsedData(
  parsed: ParsedJobData,
  jdContext?: string
): JDRequirement[] {
  const requirements: JDRequirement[] = [];
  const seenKeys = new Set<string>();

  const addReq = (
    rawKey: string,
    category: JDRequirementCategory,
    description: string,
    importance: JDRequirementImportance,
    provenance?: JDRequirement['provenance'],
    attributes?: Record<string, unknown>
  ) => {
    let key = normalizeRequirementKey(rawKey);
    if (!key) return;
    // Same 4-word prefix on two requirements must not drop the second:
    // disambiguate with a numeric suffix instead of silently discarding.
    if (seenKeys.has(key)) {
      let n = 2;
      while (seenKeys.has(`${key}__${n}`)) n++;
      key = `${key}__${n}`;
    }
    seenKeys.add(key);

    const id = generateRequirementId(jdContext, key);
    requirements.push({
      id,
      jdId: jdContext,
      key,
      category,
      description: description.trim(),
      importance,
      attributes,
      extractionStatus: 'extracted',
      provenance,
    });
  };

  // 1. Detected Skills
  if (parsed.detectedSkills && parsed.detectedSkills.length > 0) {
    for (const skill of parsed.detectedSkills) {
      addReq(
        `skills.${normalizeRequirementKey(skill)}`,
        'skill',
        `Proficiency and hands-on experience with ${skill}`,
        'required',
        {
          sourceText: skill,
          sourceSection: 'requirements',
        }
      );
    }
  }

  // 2. Extracted Requirements Section
  if (parsed.requirements && parsed.requirements.length > 0) {
    for (const line of parsed.requirements) {
      const lower = line.toLowerCase();

      // Check category heuristics
      let category: JDRequirementCategory = 'skill';
      if (
        /(?:degree|bachelor|master|phd|b\.s|m\.s|tốt\s*nghiệp|đại\s*học|bằng\s*cấp)/i.test(line)
      ) {
        category = 'education';
      } else if (
        /(?:certificate|certification|chứng\s*chỉ|aws\s*certified|pmp|ckad|cka)/i.test(line)
      ) {
        category = 'certification';
      } else if (/(?:experience|kinh\s*nghiệm|years|năm|proven\s*track\s*record)/i.test(line)) {
        category = 'experience';
      } else if (
        /(?:english|tiếng\s*anh|japanese|tiếng\s*nhật|toeic|ielts|communication)/i.test(line)
      ) {
        category = 'language';
      } else if (
        /(?:location|remote|hybrid|on-site|địa\s*điểm|hà\s*nội|hồ\s*chí\s*minh)/i.test(line)
      ) {
        category = 'location';
      }

      // Check importance heuristics
      const isRequired =
        /(?:must|required|bắt\s*buộc|yêu\s*cầu|essential|mandatory)/i.test(lower) ||
        !/(?:plus|bonus|preferred|ưu\s*tiên|nice\s*to\s*have|optional)/i.test(lower);
      const importance: JDRequirementImportance = isRequired ? 'required' : 'useful';

      // Check years of experience attributes
      const yearsMatch = line.match(/(\d+)\+?\s*(?:years?|năm)/i);
      const attributes = yearsMatch ? { years: parseInt(yearsMatch[1], 10) } : undefined;

      // Create a readable key
      const keyWords = line
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 4)
        .join('_');
      const rawKey = `${category}.${keyWords || 'req'}`;

      addReq(
        rawKey,
        category,
        line,
        importance,
        {
          sourceText: line,
          sourceSection: 'requirements',
        },
        attributes
      );
    }
  }

  // 3. Seniority level requirement if detected
  if (parsed.experienceLevel) {
    addReq(
      `experience.seniority_${parsed.experienceLevel}`,
      'experience',
      `Seniority level: ${parsed.experienceLevel}`,
      'required',
      {
        sourceText: parsed.title,
        sourceSection: 'overview',
      },
      { level: parsed.experienceLevel }
    );
  }

  return requirements;
}

/**
 * Extracts structured JD requirements using AI with strict anti-hallucination guarantees.
 * Falls back safely to deterministic heuristic parser if AI output is malformed.
 */
export async function extractJDRequirementsWithAI(
  aiService: AIServiceLike,
  rawJDText: string,
  jdContext?: string
): Promise<JDRequirement[]> {
  if (!rawJDText || !rawJDText.trim()) {
    return [];
  }

  const prompt = getExtractJDRequirementsPrompt(rawJDText);
  const messages = [
    {
      role: 'system' as const,
      content: 'You are an expert HR analyst extracting factual JD requirements.',
    },
    { role: 'user' as const, content: prompt },
  ];

  try {
    const response = await aiService.generateStructured(messages, jdRequirementExtractionSchema);

    if (!response || !Array.isArray(response.requirements) || response.requirements.length === 0) {
      // Fallback to deterministic regex-based parser
      const parsed = parseRawJobDescription(rawJDText);
      return extractJDRequirementsFromParsedData(parsed, jdContext);
    }

    const seenKeys = new Set<string>();
    const requirements: JDRequirement[] = [];

    for (const item of response.requirements) {
      let key = normalizeRequirementKey(item.key);
      if (!key) continue;
      if (seenKeys.has(key)) {
        let n = 2;
        while (seenKeys.has(`${key}__${n}`)) n++;
        key = `${key}__${n}`;
      }
      seenKeys.add(key);

      const id = generateRequirementId(jdContext, key);

      // Validate extraction status
      const extractionStatus =
        item.extractionStatus === 'ambiguous' || item.extractionStatus === 'deferred'
          ? item.extractionStatus
          : 'extracted';

      requirements.push({
        id,
        jdId: jdContext,
        key,
        category: item.category as JDRequirementCategory,
        description: item.description.trim(),
        importance: item.importance === 'required' ? 'required' : 'useful',
        attributes: item.attributes,
        extractionStatus,
        provenance: item.provenance
          ? {
              sourceText: item.provenance.sourceText,
              sourceSection: item.provenance.sourceSection,
              startOffset: item.provenance.startOffset,
              endOffset: item.provenance.endOffset,
            }
          : undefined,
      });
    }

    return requirements;
  } catch {
    // On AI error or schema failure, fall back to deterministic regex extraction
    const parsed = parseRawJobDescription(rawJDText);
    return extractJDRequirementsFromParsedData(parsed, jdContext);
  }
}

// --- Deterministic Matching Engine ----------------------------------------

/**
 * Checks whether a single CareerFact matches a JDRequirement.
 * Uses exact key matching, structured attributes, category alignment, and subject matching.
 */
export function isFactMatchingRequirement(req: JDRequirement, fact: CareerFact): boolean {
  // Category compatibility mapping
  const reqCat = req.category.toLowerCase();
  const factCat = fact.category.toLowerCase();

  const isCatCompatible =
    reqCat === factCat ||
    ((reqCat === 'skill' || reqCat === 'technical') &&
      (factCat === 'skill' || factCat === 'project')) ||
    ((reqCat === 'experience' || reqCat === 'work') &&
      (factCat === 'experience' || factCat === 'project')) ||
    (reqCat === 'language' && (factCat === 'skill' || factCat === 'preference')) ||
    (reqCat === 'location' && (factCat === 'preference' || factCat === 'experience')) ||
    (reqCat === 'work_authorization' && (factCat === 'preference' || factCat === 'achievement'));

  if (!isCatCompatible) return false;

  const reqKey = stripRequirementKeySuffix(normalizeRequirementKey(req.key));
  const factSubject = fact.subject.toLowerCase().trim();
  const factSubjectNormalized = normalizeRequirementKey(factSubject);

  // 1. Direct key/subject match
  if (factSubjectNormalized === reqKey || factSubject === req.key.toLowerCase()) {
    return true;
  }

  // If requirement key has a category prefix (e.g. "skills.react" or "skills_react"), match bare subject
  const strippedReqKey = reqKey.replace(
    /^(?:skills?|experience|education|certifications?|projects?|language|location|work_authorization)[._:]/,
    ''
  );
  if (factSubjectNormalized === strippedReqKey || factSubject === strippedReqKey) {
    return true;
  }

  // 2. Structured attribute matching
  if (fact.structured) {
    for (const [sKey, sVal] of Object.entries(fact.structured)) {
      if (typeof sVal === 'string') {
        const normVal = normalizeRequirementKey(sVal);
        if (normVal === reqKey || normVal === strippedReqKey) {
          return true;
        }
      } else if (Array.isArray(sVal)) {
        if (
          sVal.some(
            (item) => typeof item === 'string' && normalizeRequirementKey(item) === strippedReqKey
          )
        ) {
          return true;
        }
      }
      // Check if structured key itself matches
      if (normalizeRequirementKey(sKey) === strippedReqKey && Boolean(sVal)) {
        return true;
      }
    }
  }

  // 3. Fallback: claim contents match
  const claimLower = fact.claim.toLowerCase();
  const normClaim = normalizeRequirementKey(fact.claim);
  if (
    strippedReqKey.length >= 3 &&
    (claimLower.includes(strippedReqKey.replace(/[._]/g, ' ')) ||
      normClaim.includes(strippedReqKey))
  ) {
    return true;
  }

  // Also reuse Phase 4 isRequirementMatch for backward compatibility
  return isRequirementMatch(req, fact);
}

export interface MatchJDRequirementsParams {
  profileId: string;
  requirements: JDRequirement[];
  facts: CareerFact[];
  evidence?: CareerEvidence[];
  links?: FactEvidenceLink[];
  jdId?: string;
  clock?: () => string;
}

/**
 * Matches a list of JD requirements against a profile's Career Knowledge claims deterministically.
 *
 * Matching order & statuses:
 * - unsupported: requirement is ambiguous, deferred, or outside Career Knowledge representation.
 * - satisfied: confirmed non-superseded CareerFact(s) match with no contradictions.
 * - conflicting: multiple matching facts have mutually contradictory claims.
 * - uncertain: matching non-rejected facts exist, but are unconfirmed (needs_confirmation / observed).
 * - missing: no matching facts found, or all matching facts were explicitly rejected.
 */
export function matchJDRequirements({
  profileId,
  requirements,
  facts,
  evidence = [],
  links = [],
  jdId,
  clock = () => new Date().toISOString(),
}: MatchJDRequirementsParams): JDMatchReport {
  // STRICT PROFILE ISOLATION: filter facts and evidence strictly by profileId
  const profileFacts = facts.filter((f) => f.profileId === profileId);
  const profileEvidence = evidence.filter((e) => e.profileId === profileId);

  // Active facts: exclude superseded facts
  const activeFacts = profileFacts.filter((f) => !f.supersededBy);

  const results: RequirementMatchResult[] = [];
  const summary: JDMatchSummary = {
    total: requirements.length,
    satisfied: 0,
    uncertain: 0,
    missing: 0,
    conflicting: 0,
    unsupported: 0,
  };

  for (const req of requirements) {
    // 1. Check if requirement is ambiguous or unsupported by Career Knowledge
    if (req.extractionStatus === 'ambiguous' || req.extractionStatus === 'deferred') {
      summary.unsupported++;
      results.push({
        requirement: req,
        status: 'unsupported',
        matchingFactIds: [],
        matchingEvidenceIds: [],
        explanation: `Requirement "${req.description}" is ambiguous or cannot be structured deterministically from the JD text.`,
      });
      continue;
    }

    // 2. Find matching active facts
    const matchingFacts = activeFacts.filter((f) => isFactMatchingRequirement(req, f));
    const nonRejectedFacts = matchingFacts.filter((f) => f.verificationState !== 'rejected');
    const confirmedFacts = nonRejectedFacts.filter((f) => f.verificationState === 'confirmed');

    // 3. Find matching evidence for context
    const matchingFactIds = nonRejectedFacts.map((f) => f.id);
    const linkedEvidenceIds = links
      .filter((l) => matchingFactIds.includes(l.factId))
      .map((l) => l.evidenceId);

    // Also match standalone profile evidence by subject.
    // Guard against empty keys: ''.includes('') is always true and would
    // attach every profile evidence record to a garbage requirement.
    const subjectEvidenceIds = profileEvidence
      .filter((e) => {
        const sRef = (e.sourceRef || '').toLowerCase();
        const exc = (e.excerpt || '').toLowerCase();
        // req.key is `${category}.${tokens}` (e.g. "skills.react"); the dotted
        // prefix never appears in URLs/prose, so match on the meaningful
        // trailing tokens instead of the full dotted key.
        const keySuffix =
          normalizeRequirementKey(req.key).split('.').slice(1).join('_') ||
          normalizeRequirementKey(req.key);
        const phrase = keySuffix.replace(/_/g, ' ').trim();
        if (!phrase || phrase === 'unspecified requirement') return false;
        if (sRef.includes(phrase) || exc.includes(phrase)) return true;
        const tokens = keySuffix.split('_').filter((t) => t.length > 2);
        return tokens.some((t) => sRef.includes(t) || exc.includes(t));
      })
      .map((e) => e.id);

    const matchingEvidenceIds = Array.from(new Set([...linkedEvidenceIds, ...subjectEvidenceIds]));

    // 4. Determine Match Status
    if (matchingFacts.length === 0) {
      summary.missing++;
      results.push({
        requirement: req,
        status: 'missing',
        matchingFactIds: [],
        matchingEvidenceIds,
        explanation: `No matching Career Knowledge was found for "${req.description}".`,
      });
    } else if (confirmedFacts.length > 0) {
      // Check for contradictions among non-rejected matching facts.
      // Unified semantics with questionEngine (see areFactsContradictory):
      // structured-vs-structured when both sides carry a payload, otherwise
      // claim-vs-claim — so neither key-order variants false-conflict nor
      // pure-claim contradictions slip through.
      const primaryConfirmed = confirmedFacts[0];
      const conflicting = nonRejectedFacts.filter(
        (f) => f.id !== primaryConfirmed.id && areFactsContradictory(f, primaryConfirmed)
      );

      if (conflicting.length > 0) {
        summary.conflicting++;
        results.push({
          requirement: req,
          status: 'conflicting',
          matchingFactIds: nonRejectedFacts.map((f) => f.id),
          conflictingFactIds: conflicting.map((f) => f.id),
          matchingEvidenceIds,
          explanation: `Multiple conflicting career facts found matching requirement "${req.key}".`,
        });
      } else {
        // Satisfied by confirmed fact
        summary.satisfied++;
        results.push({
          requirement: req,
          status: 'satisfied',
          matchingFactIds: confirmedFacts.map((f) => f.id),
          matchingEvidenceIds,
          explanation: `Requirement is supported by ${confirmedFacts.length} confirmed career fact(s).`,
        });
      }
    } else if (nonRejectedFacts.length > 0) {
      // Only unconfirmed facts exist (needs_confirmation / observed)
      summary.uncertain++;
      results.push({
        requirement: req,
        status: 'uncertain',
        matchingFactIds: nonRejectedFacts.map((f) => f.id),
        matchingEvidenceIds,
        explanation: `Matching career fact(s) exist but require explicit confirmation (${nonRejectedFacts.map((f) => f.verificationState).join(', ')}).`,
      });
    } else {
      // All matching facts were explicitly rejected by the user
      summary.missing++;
      results.push({
        requirement: req,
        status: 'missing',
        matchingFactIds: [],
        matchingEvidenceIds,
        explanation: `Previous career claims matching requirement "${req.key}" were explicitly rejected by the user.`,
      });
    }
  }

  return {
    profileId,
    jdId,
    matchedAt: clock(),
    results,
    summary,
  };
}

// --- Question Engine & Resume Projection Bridges --------------------------

/**
 * Converts unresolved JD match results (uncertain, missing, conflicting) into
 * Phase 4 KnowledgeRequirement input for the existing Question Engine.
 */
export function getUnresolvedRequirements(report: JDMatchReport): KnowledgeRequirement[] {
  return report.results
    .filter((r) => r.status === 'uncertain' || r.status === 'missing' || r.status === 'conflicting')
    .map((r) => ({
      key: r.requirement.key,
      category: r.requirement.category,
      description: r.requirement.description,
      importance: r.requirement.importance,
    }));
}

/**
 * Converts JD match results into Phase 4 KnowledgeGaps using the Question Engine.
 */
export function convertMatchResultsToGaps(
  report: JDMatchReport,
  facts: CareerFact[]
): KnowledgeGap[] {
  const unresolved = getUnresolvedRequirements(report);
  return detectKnowledgeGaps(unresolved, facts);
}

/**
 * Extracts all eligible confirmed Fact IDs that satisfy JD requirements.
 * Provides selection context for later Resume tailoring without modifying Phase 6 projection semantics.
 */
export function getEligibleConfirmedFactIds(report: JDMatchReport): string[] {
  const factIds = new Set<string>();
  for (const r of report.results) {
    if (r.status === 'satisfied') {
      for (const fid of r.matchingFactIds) {
        factIds.add(fid);
      }
    }
  }
  return Array.from(factIds);
}
