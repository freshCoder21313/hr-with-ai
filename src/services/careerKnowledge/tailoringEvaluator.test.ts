import { describe, it, expect } from 'vitest';
import type { CareerFact, JDMatchReport, TailoredResumeAIResponse } from '@/types/careerKnowledge';
import {
  evaluateTailoringResult,
  normalizeNumericToken,
  extractNormalizedNumbers,
  isNumberGrounded,
  evaluateSemanticStrengthening,
  evaluateUnsupportedScale,
  evaluateUnsupportedSeniority,
  evaluateRequirementNonClaim,
  evaluateDateFidelity,
  evaluateEntityFidelity,
  EVALUATOR_VERSION,
} from './tailoringEvaluator';
import { goldenFixtures } from './fixtures/goldenFixtures';
import { adversarialFixtures } from './fixtures/adversarialFixtures';
import { runTailoringHarness } from './tailoringHarness';
import { tailorResumeWithCareerKnowledge } from './resumeTailoring';
import { CAREER_KNOWLEDGE_TAILORING_PROMPT_VERSION } from '@/services/prompts/careerKnowledgeTailoring';

describe('Phase 12: Grounded Resume Evaluation & Tailoring Quality Harness', () => {
  const PROFILE_A = 'profile-eval-alpha';
  const PROFILE_B = 'profile-eval-beta';

  const mockFactGo: CareerFact = {
    id: 'fact-go-1',
    profileId: PROFILE_A,
    category: 'skill',
    subject: 'Go',
    claim: 'Worked on Go backend services for 3 years at Acme Corp handling 2M requests/day',
    structured: { skill: 'Go', years: 3, company: 'Acme Corp' },
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockFactAcme: CareerFact = {
    id: 'fact-acme-2',
    profileId: PROFILE_A,
    category: 'experience',
    subject: 'Acme Corp',
    claim: 'Software Engineer at Acme Corp from 2022-01 to 2024-01 maintaining 99.9% uptime',
    structured: {
      company: 'Acme Corp',
      role: 'Software Engineer',
      startDate: '2022-01',
      endDate: '2024-01',
    },
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockFactUnconfirmedK8s: CareerFact = {
    id: 'fact-k8s-3',
    profileId: PROFILE_A,
    category: 'skill',
    subject: 'Kubernetes',
    claim: 'Observed Kubernetes configs in repo',
    verificationState: 'needs_confirmation',
    origin: 'external',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockFactSuperseded: CareerFact = {
    id: 'fact-old-4',
    profileId: PROFILE_A,
    category: 'skill',
    subject: 'Python',
    claim: 'Junior Python programmer',
    verificationState: 'confirmed',
    origin: 'user',
    supersededBy: 'fact-new-python',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  };

  const mockFactForeignProfile: CareerFact = {
    id: 'fact-foreign-5',
    profileId: PROFILE_B,
    category: 'skill',
    subject: 'Rust',
    claim: 'Senior Rust Systems Developer',
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockJDReport: JDMatchReport = {
    profileId: PROFILE_A,
    matchedAt: '2026-01-01T00:00:00.000Z',
    results: [
      {
        requirement: {
          id: 'req:1',
          key: 'go',
          category: 'skill',
          description: 'Go backend development',
        },
        status: 'satisfied',
        matchingFactIds: ['fact-go-1'],
        matchingEvidenceIds: [],
        explanation: 'Confirmed Go experience',
      },
      {
        requirement: {
          id: 'req:2',
          key: 'terraform',
          category: 'skill',
          description: 'Terraform IaC',
        },
        status: 'missing',
        matchingFactIds: [],
        matchingEvidenceIds: [],
        explanation: 'No confirmed Terraform facts',
      },
    ],
    summary: { total: 2, satisfied: 1, uncertain: 0, missing: 1, conflicting: 0, unsupported: 0 },
  };

  const defaultContext = {
    profileId: PROFILE_A,
    authorizedFacts: [mockFactGo, mockFactAcme],
    allProfileFacts: [mockFactGo, mockFactAcme, mockFactUnconfirmedK8s, mockFactSuperseded],
    jdMatchReport: mockJDReport,
  };

  // --- Layer 1: Structural Validity ---------------------------------------
  describe('Layer 1: Structural Validity', () => {
    it('passes for structurally valid tailored response', () => {
      const validResponse: TailoredResumeAIResponse = {
        summary: {
          text: 'Software Engineer with 3 years developing Go backend services.',
          derivedFromFactIds: ['fact-go-1'],
        },
        skills: [{ name: 'Go', keywords: ['Backend'], derivedFromFactIds: ['fact-go-1'] }],
      };

      const result = evaluateTailoringResult(validResponse, defaultContext);
      expect(result.structuralPass).toBe(true);
      expect(result.attributionPass).toBe(true);
    });

    it('rejects entries with missing derivedFromFactIds attribution', () => {
      const missingAttributionResponse: TailoredResumeAIResponse = {
        skills: [{ name: 'Go', keywords: ['Backend'], derivedFromFactIds: [] }],
      };

      const result = evaluateTailoringResult(missingAttributionResponse, defaultContext);
      expect(result.attributionPass).toBe(false);
      expect(result.overallPass).toBe(false);
      expect(result.validationIssues).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'missing_attribution' })])
      );
    });
  });

  // --- Layer 2: Source Authorization --------------------------------------
  describe('Layer 2: Source Authorization', () => {
    it('accepts valid authorized confirmed fact IDs', () => {
      const response: TailoredResumeAIResponse = {
        skills: [{ name: 'Go', derivedFromFactIds: ['fact-go-1'] }],
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.sourceAuthorizationPass).toBe(true);
    });

    it('rejects foreign profile fact IDs', () => {
      const response: TailoredResumeAIResponse = {
        skills: [{ name: 'Rust', derivedFromFactIds: ['fact-foreign-5'] }],
      };

      const context = {
        ...defaultContext,
        allProfileFacts: [...defaultContext.allProfileFacts, mockFactForeignProfile],
      };

      const result = evaluateTailoringResult(response, context);
      expect(result.sourceAuthorizationPass).toBe(false);
      expect(result.validationIssues).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'foreign_profile_fact' })])
      );
    });

    it('rejects unconfirmed fact IDs (needs_confirmation)', () => {
      const response: TailoredResumeAIResponse = {
        skills: [{ name: 'Kubernetes', derivedFromFactIds: ['fact-k8s-3'] }],
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.sourceAuthorizationPass).toBe(false);
      expect(result.validationIssues).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'unconfirmed_fact' })])
      );
    });

    it('rejects superseded fact IDs', () => {
      const response: TailoredResumeAIResponse = {
        skills: [{ name: 'Python', derivedFromFactIds: ['fact-old-4'] }],
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.sourceAuthorizationPass).toBe(false);
      expect(result.validationIssues).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'superseded_fact' })])
      );
    });
  });

  // --- Layer 3: Numeric Fidelity & Normalization ---------------------------
  describe('Layer 3: Numeric Fidelity & Normalization', () => {
    it('accepts safe numeric normalization (2M -> 2 million, 99.9% -> 99.9 percent)', () => {
      const response: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            highlights: ['Processed 2 million requests per day with 99.9 percent uptime.'],
            derivedFromFactIds: ['fact-go-1', 'fact-acme-2'],
          },
        ],
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.numericFidelityPass).toBe(true);
      expect(result.numericFidelityIssues).toHaveLength(0);
    });

    it('rejects inflated metrics (2M -> 20M, 99.9% -> 99.99%)', () => {
      const response: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            highlights: ['Processed 20M requests/day.'],
            derivedFromFactIds: ['fact-go-1'],
          },
        ],
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.numericFidelityPass).toBe(false);
      expect(result.numericFidelityIssues.length).toBeGreaterThan(0);
    });

    it('rejects altered counts (3 years -> 5 years, 10 nodes -> 100 nodes)', () => {
      const response: TailoredResumeAIResponse = {
        summary: {
          text: '5 years of Go development experience.',
          derivedFromFactIds: ['fact-go-1'],
        },
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.numericFidelityPass).toBe(false);
    });

    it('correctly normalizes tokens and extracts values', () => {
      expect(normalizeNumericToken('2M')?.value).toBe(2000000);
      expect(normalizeNumericToken('2 million')?.value).toBe(2000000);
      expect(normalizeNumericToken('200k')?.value).toBe(200000);
      expect(normalizeNumericToken('50%')?.value).toBe(50);
      expect(normalizeNumericToken('99.9 percent')?.value).toBe(99.9);
      expect(normalizeNumericToken('3 years')?.value).toBe(3);

      const nums = extractNormalizedNumbers(
        'Handling 2M requests/day with 99.9% availability across 10 servers'
      );
      expect(nums).toHaveLength(3);
      expect(isNumberGrounded(nums[0], [{ raw: '2 million', value: 2000000, unit: 'm' }])).toBe(
        true
      );
    });
  });

  // --- Layer 4: Date Fidelity ----------------------------------------------
  describe('Layer 4: Date Fidelity', () => {
    it('passes when dates match source facts', () => {
      const response: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            startDate: '2022-01',
            endDate: '2024-01',
            derivedFromFactIds: ['fact-acme-2'],
          },
        ],
      };

      const issues = evaluateDateFidelity(response, defaultContext.authorizedFacts);
      expect(issues).toHaveLength(0);
    });

    it('rejects extended or invented employment duration (2022-2024 -> 2021-2024 / 2022-2025)', () => {
      const shiftedStartResponse: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            startDate: '2021-01',
            endDate: '2024-01',
            derivedFromFactIds: ['fact-acme-2'],
          },
        ],
      };

      const shiftedEndResponse: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            startDate: '2022-01',
            endDate: '2025-01',
            derivedFromFactIds: ['fact-acme-2'],
          },
        ],
      };

      expect(
        evaluateDateFidelity(shiftedStartResponse, defaultContext.authorizedFacts).length
      ).toBeGreaterThan(0);
      expect(
        evaluateDateFidelity(shiftedEndResponse, defaultContext.authorizedFacts).length
      ).toBeGreaterThan(0);
    });
  });

  // --- Layer 5: Entity Fidelity --------------------------------------------
  describe('Layer 5: Entity Fidelity', () => {
    it('passes when employers, skills, and projects match authorized facts', () => {
      const response: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            derivedFromFactIds: ['fact-acme-2'],
          },
        ],
        skills: [{ name: 'Go', derivedFromFactIds: ['fact-go-1'] }],
      };

      const issues = evaluateEntityFidelity(response, defaultContext.authorizedFacts);
      expect(issues).toHaveLength(0);
    });

    it('rejects invented employer (Acme Corp -> Meta / Google)', () => {
      const response: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Google LLC',
            position: 'Software Engineer',
            derivedFromFactIds: ['fact-acme-2'],
          },
        ],
      };

      const issues = evaluateEntityFidelity(response, defaultContext.authorizedFacts);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('Google LLC');
    });

    it('rejects invented skill without authorizing fact (Go -> Rust)', () => {
      const response: TailoredResumeAIResponse = {
        skills: [{ name: 'Rust', derivedFromFactIds: ['fact-go-1'] }],
      };

      const issues = evaluateEntityFidelity(response, defaultContext.authorizedFacts);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('Rust');
    });
  });

  // --- Layer 6: Semantic Strengthening -------------------------------------
  describe('Layer 6: Semantic Strengthening', () => {
    it('classifies preservation vs strengthening accurately', () => {
      // Good phrasing: "Developed backend services in Go"
      const goodPhrasing = evaluateSemanticStrengthening(
        'Developed backend services in Go',
        [mockFactGo],
        'Work'
      );
      expect(goodPhrasing).toBeNull();

      // Strengthening: "worked on" -> "led the architecture of"
      const strengthened = evaluateSemanticStrengthening(
        'Led the architecture of large-scale Go microservices',
        [mockFactGo],
        'Work'
      );
      expect(strengthened).not.toBeNull();
      expect(strengthened?.classification).toBe('strengthened');
      expect(strengthened?.detectedPattern).toBe('led');
    });

    it('detects responsibility escalation verbs (worked on -> architected/owned/drove/spearheaded)', () => {
      const testCases = [
        'Architected and owned the core payment service',
        'Spearheaded the technical vision for Go services',
        'Managed and directed the distributed backend team',
        'Drove engineering execution across projects',
      ];

      for (const text of testCases) {
        const result = evaluateSemanticStrengthening(text, [mockFactGo], 'Summary');
        expect(result).not.toBeNull();
        expect(result?.classification).toBe('strengthened');
      }
    });
  });

  // --- Layer 7: Unsupported Scale Claims -----------------------------------
  describe('Layer 7: Unsupported Scale Claims', () => {
    it('detects unauthorized enterprise/global scale claims', () => {
      const scaleClaims = [
        'Engineered enterprise-scale platform handling millions of users.',
        'Designed global platform with petabytes of storage.',
        'Operated mission-critical high-traffic infrastructure.',
      ];

      for (const claim of scaleClaims) {
        const issue = evaluateUnsupportedScale(claim, [mockFactGo]);
        expect(issue).not.toBeNull();
      }
    });

    it('allows scale claims when supported by source facts', () => {
      const supportedFact: CareerFact = {
        ...mockFactGo,
        claim: 'Operated high-traffic enterprise-scale payment gateways',
      };

      const issue = evaluateUnsupportedScale('Maintained high-traffic enterprise-scale services', [
        supportedFact,
      ]);
      expect(issue).toBeNull();
    });
  });

  // --- Layer 8: Unsupported Seniority / JD Title Leakage --------------------
  describe('Layer 8: Unsupported Seniority & JD Title Leakage', () => {
    it('detects JD title leakage upgrading role seniority without fact support', () => {
      const issue = evaluateUnsupportedSeniority(
        'Principal Architect',
        [mockFactAcme],
        'Principal Cloud Architect'
      );
      expect(issue).not.toBeNull();
      expect(issue).toContain('Principal Cloud Architect');
    });

    it('allows title when authorized in source facts', () => {
      const seniorFact: CareerFact = {
        ...mockFactAcme,
        claim: 'Senior Software Engineer at Acme Corp',
        structured: { role: 'Senior Software Engineer' },
      };

      const issue = evaluateUnsupportedSeniority('Senior Software Engineer', [seniorFact]);
      expect(issue).toBeNull();
    });
  });

  // --- Layer 9: Requirement Non-Claim --------------------------------------
  describe('Layer 9: Requirement Non-Claim', () => {
    it('flags claims for missing JD requirements (e.g. Terraform)', () => {
      const response: TailoredResumeAIResponse = {
        summary: {
          text: 'Experienced in Go and Terraform infrastructure as code.',
          derivedFromFactIds: ['fact-go-1'],
        },
      };

      const issues = evaluateRequirementNonClaim(
        response,
        mockJDReport,
        defaultContext.authorizedFacts
      );
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('terraform');
    });

    it('passes when missing JD requirements are not claimed', () => {
      const response: TailoredResumeAIResponse = {
        summary: {
          text: 'Backend Engineer with 3 years of Go development.',
          derivedFromFactIds: ['fact-go-1'],
        },
      };

      const issues = evaluateRequirementNonClaim(
        response,
        mockJDReport,
        defaultContext.authorizedFacts
      );
      expect(issues).toHaveLength(0);
    });
  });

  // --- Layer 10: Multi-Fact Attribution Integrity --------------------------
  describe('Layer 10: Attribution Integrity & Multi-Fact Attribution', () => {
    it('validates multi-fact attribution across multiple confirmed facts', () => {
      const response: TailoredResumeAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            highlights: ['Developed Go backend services handling 2M requests/day at Acme Corp.'],
            derivedFromFactIds: ['fact-go-1', 'fact-acme-2'],
          },
        ],
      };

      const result = evaluateTailoringResult(response, defaultContext);
      expect(result.attributionPass).toBe(true);
      expect(result.sourceAuthorizationPass).toBe(true);
      expect(result.overallPass).toBe(true);
    });
  });

  // --- Full Golden Test Suite Execution ------------------------------------
  describe('Golden Test Suite (10 Real-World Cases)', () => {
    it('evaluates all 10 golden fixtures with 100% pass across all dimensions', () => {
      expect(goldenFixtures).toHaveLength(10);

      const harnessReport = runTailoringHarness(goldenFixtures, []);
      expect(harnessReport.goldenSuite.total).toBe(10);
      expect(harnessReport.goldenSuite.passed).toBe(10);
      expect(harnessReport.goldenSuite.failed).toBe(0);

      expect(harnessReport.dimensionPassRates.structural).toBe(1.0);
      expect(harnessReport.dimensionPassRates.sourceAuthorization).toBe(1.0);
      expect(harnessReport.dimensionPassRates.attribution).toBe(1.0);
      expect(harnessReport.dimensionPassRates.numericFidelity).toBe(1.0);
      expect(harnessReport.dimensionPassRates.dateFidelity).toBe(1.0);
      expect(harnessReport.dimensionPassRates.entityFidelity).toBe(1.0);
      expect(harnessReport.dimensionPassRates.semanticStrengthening).toBe(1.0);
      expect(harnessReport.dimensionPassRates.unsupportedScale).toBe(1.0);
      expect(harnessReport.dimensionPassRates.unsupportedSeniority).toBe(1.0);
      expect(harnessReport.dimensionPassRates.requirementNonClaim).toBe(1.0);
      expect(harnessReport.dimensionPassRates.relevance).toBe(1.0);
    });
  });

  // --- Full Adversarial Test Suite Execution -------------------------------
  describe('Adversarial Test Suite (12 Unsafe Cases)', () => {
    it('detects and flags all 12 adversarial cases on their expected dimensions', () => {
      expect(adversarialFixtures).toHaveLength(12);

      const harnessReport = runTailoringHarness([], adversarialFixtures);
      expect(harnessReport.adversarialSuite.total).toBe(12);
      expect(harnessReport.adversarialSuite.detected).toBe(12);
      expect(harnessReport.adversarialSuite.missed).toBe(0);

      for (const res of harnessReport.adversarialSuite.results) {
        expect(res.detected).toBe(true);
        expect(res.failedDimensionMatched).toBe(true);
      }
    });
  });

  // --- Fallback & Deterministic Safety -------------------------------------
  describe('Fallback Evaluation & Safety', () => {
    it('evaluates fallback projection when AI fails or returns invalid entities', async () => {
      // Trigger fallback by passing null AI service
      const tailorResult = await tailorResumeWithCareerKnowledge(
        null,
        {
          profileId: PROFILE_A,
          jdMatchReport: mockJDReport,
          targetJobTitle: 'Senior Go Developer',
        },
        [mockFactGo, mockFactAcme]
      );

      expect(tailorResult.success).toBe(true);
      expect(tailorResult.fallbackUsed).toBe(true);
      expect(tailorResult.tailoredResumeData).toBeDefined();
      expect(tailorResult.attributions.length).toBeGreaterThan(0);

      // Verify fallback evaluation metadata
      const evalResult = evaluateTailoringResult(
        {
          work: tailorResult.tailoredResumeData.work as any,
          skills: tailorResult.tailoredResumeData.skills as any,
        },
        defaultContext,
        { fallbackUsed: true }
      );

      expect(evalResult.fallbackUsed).toBe(true);
      expect(evalResult.sourceAuthorizationPass).toBe(true);
    });
  });

  // --- Reproducibility & Version Metadata ----------------------------------
  describe('Reproducibility & Version Metadata', () => {
    it('records evaluator, prompt, and fixture version metadata in evaluation results', () => {
      const response: TailoredResumeAIResponse = {
        skills: [{ name: 'Go', derivedFromFactIds: ['fact-go-1'] }],
      };

      const result = evaluateTailoringResult(response, defaultContext, {
        fixtureVersion: '2.1.0',
      });

      expect(result.metadata.evaluatorVersion).toBe(EVALUATOR_VERSION);
      expect(result.metadata.promptVersion).toBe(CAREER_KNOWLEDGE_TAILORING_PROMPT_VERSION);
      expect(result.metadata.fixtureVersion).toBe('2.1.0');
      expect(result.metadata.evaluatedAt).toBeDefined();
    });
  });
});
