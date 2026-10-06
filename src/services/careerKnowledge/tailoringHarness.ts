// Phase 12 — Tailoring Regression Harness
//
// Provides a structured offline evaluation test runner for golden and adversarial fixture suites.
// Calculates dimension pass rates, detects regressions across prompt/model versions, and enforces
// deterministic fidelity and grounding boundaries.

import type {
  TailoringAdversarialFixture,
  TailoringEvaluationResult,
  TailoringGoldenFixture,
} from '@/types/careerKnowledge';
import { evaluateTailoringResult, EVALUATOR_VERSION } from './tailoringEvaluator';
import { getAuthorizedConfirmedFacts } from './resumeTailoring';
import { getEligibleConfirmedFactIds } from './jdMatching';

export interface HarnessReport {
  harnessVersion: string;
  evaluatedAt: string;
  goldenSuite: {
    total: number;
    passed: number;
    failed: number;
    results: Array<{
      fixtureId: string;
      name: string;
      overallPass: boolean;
      evaluation: TailoringEvaluationResult;
    }>;
  };
  adversarialSuite: {
    total: number;
    detected: number;
    missed: number;
    results: Array<{
      fixtureId: string;
      category: string;
      detected: boolean;
      failedDimensionMatched: boolean;
      evaluation: TailoringEvaluationResult;
    }>;
  };
  dimensionPassRates: {
    structural: number;
    sourceAuthorization: number;
    attribution: number;
    numericFidelity: number;
    dateFidelity: number;
    entityFidelity: number;
    semanticStrengthening: number;
    unsupportedScale: number;
    unsupportedSeniority: number;
    requirementNonClaim: number;
    relevance: number;
  };
}

/**
 * Runs the evaluation suite over all provided golden and adversarial fixtures.
 */
export function runTailoringHarness(
  goldenList: TailoringGoldenFixture[],
  adversarialList: TailoringAdversarialFixture[]
): HarnessReport {
  const goldenResults: HarnessReport['goldenSuite']['results'] = [];
  let goldenPassed = 0;

  for (const g of goldenList) {
    const eligibleFactIds = getEligibleConfirmedFactIds(g.jdMatchReport);
    const { authorizedFacts } = getAuthorizedConfirmedFacts(g.facts, g.profileId, eligibleFactIds);

    const evaluation = evaluateTailoringResult(
      g.validTailoredResponse,
      {
        profileId: g.profileId,
        authorizedFacts,
        allProfileFacts: g.facts.filter((f) => f.profileId === g.profileId),
        jdMatchReport: g.jdMatchReport,
        baseResume: g.baseResume,
        targetJobTitle: g.targetJobTitle,
        targetJobDescription: g.targetJobDescription,
        targetCompany: g.targetCompany,
      },
      {
        fixtureVersion: g.version,
        expectedRelevanceFocus: g.expectedRelevanceFocus,
      }
    );

    if (evaluation.overallPass) {
      goldenPassed++;
    }

    goldenResults.push({
      fixtureId: g.id,
      name: g.name,
      overallPass: evaluation.overallPass,
      evaluation,
    });
  }

  const adversarialResults: HarnessReport['adversarialSuite']['results'] = [];
  let adversarialDetected = 0;

  for (const a of adversarialList) {
    const eligibleFactIds = getEligibleConfirmedFactIds(a.jdMatchReport);
    const { authorizedFacts } = getAuthorizedConfirmedFacts(a.facts, a.profileId, eligibleFactIds);

    const evaluation = evaluateTailoringResult(
      a.unsafeResponse,
      {
        profileId: a.profileId,
        authorizedFacts,
        allProfileFacts: a.facts,
        jdMatchReport: a.jdMatchReport,
        baseResume: a.baseResume,
        targetJobTitle: a.targetJobTitle,
        targetJobDescription: a.targetJobDescription,
      },
      {
        fixtureVersion: '1.0.0',
      }
    );

    // Adversarial output is correctly detected if overallPass is FALSE
    const detected = !evaluation.overallPass;
    const failedDimensionMatched = evaluation[a.expectedFailureDimension] === false;

    if (detected) {
      adversarialDetected++;
    }

    adversarialResults.push({
      fixtureId: a.id,
      category: a.category,
      detected,
      failedDimensionMatched,
      evaluation,
    });
  }

  // Calculate dimension pass rates on golden suite
  const totalGolden = goldenList.length;
  const calcRate = (key: keyof TailoringEvaluationResult) =>
    totalGolden === 0
      ? 1.0
      : goldenResults.filter((r) => r.evaluation[key] === true).length / totalGolden;

  return {
    harnessVersion: EVALUATOR_VERSION,
    evaluatedAt: new Date().toISOString(),
    goldenSuite: {
      total: totalGolden,
      passed: goldenPassed,
      failed: totalGolden - goldenPassed,
      results: goldenResults,
    },
    adversarialSuite: {
      total: adversarialList.length,
      detected: adversarialDetected,
      missed: adversarialList.length - adversarialDetected,
      results: adversarialResults,
    },
    dimensionPassRates: {
      structural: calcRate('structuralPass'),
      sourceAuthorization: calcRate('sourceAuthorizationPass'),
      attribution: calcRate('attributionPass'),
      numericFidelity: calcRate('numericFidelityPass'),
      dateFidelity: calcRate('dateFidelityPass'),
      entityFidelity: calcRate('entityFidelityPass'),
      semanticStrengthening: calcRate('semanticStrengtheningPass'),
      unsupportedScale: calcRate('unsupportedScalePass'),
      unsupportedSeniority: calcRate('unsupportedSeniorityPass'),
      requirementNonClaim: calcRate('requirementNonClaimPass'),
      relevance: calcRate('relevancePass'),
    },
  };
}
