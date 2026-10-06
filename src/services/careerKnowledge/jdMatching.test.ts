import { describe, it, expect } from 'vitest';
import type {
  CareerFact,
  CareerEvidence,
  FactEvidenceLink,
  JDRequirement,
} from '@/types/careerKnowledge';
import {
  generateRequirementId,
  normalizeRequirementKey,
  extractJDRequirementsFromParsedData,
  extractJDRequirementsWithAI,
  matchJDRequirements,
  convertMatchResultsToGaps,
  getUnresolvedRequirements,
  getEligibleConfirmedFactIds,
} from './jdMatching';
import type { ParsedJobData } from '@/services/jobs/jdParser';
import type { AIServiceLike } from './questionEngine';

describe('Phase 10 — JD Requirements & Deterministic Career Knowledge Matching', () => {
  const profileA = 'profile-a-123';
  const profileB = 'profile-b-456';

  const createFact = (overrides: Partial<CareerFact>): CareerFact => ({
    id: `fact-${Math.random().toString(36).substring(2, 9)}`,
    profileId: profileA,
    category: 'skill',
    subject: 'TypeScript',
    claim: '5 years of professional TypeScript experience',
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });

  describe('Requirement Key & Identity Normalization', () => {
    it('normalizes requirement keys deterministically to lower_snake_case', () => {
      expect(normalizeRequirementKey('React Native')).toBe('react_native');
      expect(normalizeRequirementKey('Kubernetes / Docker')).toBe('kubernetes_docker');
      expect(normalizeRequirementKey('skills.go.backend')).toBe('skills.go.backend');
      expect(normalizeRequirementKey('  --AWS Cloud-- ')).toBe('aws_cloud');
    });

    it('generates deterministic requirement IDs independent of array index', () => {
      const id1 = generateRequirementId('job_backend_dev', 'Golang');
      const id2 = generateRequirementId('job_backend_dev', 'Golang');
      const id3 = generateRequirementId('job_backend_dev', 'Python');

      expect(id1).toBe('req:job_backend_dev:golang');
      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
    });
  });

  describe('JD Requirement Extraction', () => {
    it('extracts structured requirements deterministically from ParsedJobData with provenance and categories', () => {
      const parsedData: ParsedJobData = {
        company: 'Acme Corp',
        title: 'Senior Backend Engineer',
        description: 'We need a senior Go engineer',
        experienceLevel: 'senior',
        detectedSkills: ['Go', 'Docker', 'PostgreSQL'],
        requirements: [
          'Must have 4+ years Go experience',
          'Bachelor degree in Computer Science or related field',
          'AWS Certified Solutions Architect is a plus',
          'Fluent in English communication',
        ],
        responsibilities: ['Architect backend services'],
        suggestedCustomPrompt: '',
      };

      const requirements = extractJDRequirementsFromParsedData(parsedData, 'acme-senior-backend');

      expect(requirements.length).toBeGreaterThanOrEqual(5);

      // Check skill requirement
      const goSkill = requirements.find((r) => r.key.includes('go'));
      expect(goSkill).toBeDefined();
      expect(goSkill?.id).toBe('req:acme-senior-backend:skills.go');
      expect(goSkill?.importance).toBe('required');
      expect(goSkill?.provenance?.sourceSection).toBe('requirements');

      // Check education requirement
      const eduReq = requirements.find((r) => r.category === 'education');
      expect(eduReq).toBeDefined();
      expect(eduReq?.description).toContain('Bachelor degree');

      // Check certification requirement & optional importance
      const certReq = requirements.find((r) => r.category === 'certification');
      expect(certReq).toBeDefined();
      expect(certReq?.importance).toBe('useful');

      // Check language requirement
      const langReq = requirements.find((r) => r.category === 'language');
      expect(langReq).toBeDefined();

      // Check seniority requirement
      const seniorityReq = requirements.find((r) => r.key.includes('seniority_senior'));
      expect(seniorityReq).toBeDefined();
      expect(seniorityReq?.attributes?.level).toBe('senior');
    });

    it('extracts structured requirements via AI with fallback on malformed output', async () => {
      const mockAIService: AIServiceLike = {
        generateStructured: async <T>() =>
          ({
            requirements: [
              {
                key: 'kubernetes',
                category: 'skill',
                description: 'Hands-on production Kubernetes cluster management',
                importance: 'required',
                attributes: { production: true },
                extractionStatus: 'extracted',
                provenance: {
                  sourceText: 'Manage Kubernetes in production',
                  sourceSection: 'requirements',
                },
              },
              {
                key: 'vague_cultural_claim',
                category: 'experience',
                description: 'Thrives in fast-paced ambiguous environment',
                importance: 'useful',
                extractionStatus: 'ambiguous',
                provenance: {
                  sourceText: 'Fast-paced rockstar',
                  sourceSection: 'overview',
                },
              },
            ],
          }) as unknown as T,
      };

      const rawText =
        'Job: Backend Lead. Must manage Kubernetes in production. Fast-paced rockstar.';
      const requirements = await extractJDRequirementsWithAI(
        mockAIService,
        rawText,
        'backend-lead'
      );

      expect(requirements).toHaveLength(2);
      expect(requirements[0].id).toBe('req:backend-lead:kubernetes');
      expect(requirements[0].extractionStatus).toBe('extracted');
      expect(requirements[0].attributes).toEqual({ production: true });

      expect(requirements[1].extractionStatus).toBe('ambiguous');
    });

    it('falls back safely to heuristic extraction if AI fails', async () => {
      const mockFailingAI: AIServiceLike = {
        generateStructured: async () => {
          throw new Error('AI Provider Quota Exceeded');
        },
      };

      const rawText = `
Job Title: Python Developer
Company: DataCorp

Requirements:
• 3+ years Python experience
• Experience with PostgreSQL
`;
      const requirements = await extractJDRequirementsWithAI(
        mockFailingAI,
        rawText,
        'datacorp-python'
      );

      expect(requirements.length).toBeGreaterThan(0);
      const pythonReq = requirements.find((r) => r.key.includes('python'));
      expect(pythonReq).toBeDefined();
    });
  });

  describe('Deterministic Matching Logic & Verification States', () => {
    it('marks a requirement as SATISFIED when a confirmed CareerFact exists', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:go',
        key: 'go',
        category: 'skill',
        description: 'Experience with Go programming language',
        importance: 'required',
      };

      const confirmedFact = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'Go',
        claim: 'Proficient in Go backend microservices',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [confirmedFact],
      });

      expect(report.summary.satisfied).toBe(1);
      expect(report.summary.uncertain).toBe(0);
      expect(report.summary.missing).toBe(0);
      expect(report.results[0].status).toBe('satisfied');
      expect(report.results[0].matchingFactIds).toEqual([confirmedFact.id]);
    });

    it('marks a requirement as UNCERTAIN when only needs_confirmation or observed facts exist', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:kubernetes',
        key: 'kubernetes',
        category: 'skill',
        description: 'Production Kubernetes management',
        importance: 'required',
      };

      const unconfirmedFact = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'Kubernetes',
        claim: 'Operated Kubernetes clusters on AWS',
        verificationState: 'needs_confirmation',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [unconfirmedFact],
      });

      expect(report.summary.satisfied).toBe(0);
      expect(report.summary.uncertain).toBe(1);
      expect(report.results[0].status).toBe('uncertain');
      expect(report.results[0].matchingFactIds).toEqual([unconfirmedFact.id]);
    });

    it('marks a requirement as MISSING when no matching facts exist', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:terraform',
        key: 'terraform',
        category: 'skill',
        description: 'Terraform IaC experience',
        importance: 'required',
      };

      const fact = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'React',
        claim: '5 years React development',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [fact],
      });

      expect(report.summary.missing).toBe(1);
      expect(report.results[0].status).toBe('missing');
      expect(report.results[0].matchingFactIds).toEqual([]);
      expect(report.results[0].explanation).toContain('No matching Career Knowledge was found');
    });

    it('marks a requirement as MISSING (unresolved) when matching facts were rejected by user', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:cplusplus',
        key: 'cplusplus',
        category: 'skill',
        description: 'C++ low-level systems programming',
        importance: 'required',
      };

      const rejectedFact = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'C++',
        claim: 'Legacy C++ maintenance',
        verificationState: 'rejected',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [rejectedFact],
      });

      expect(report.summary.missing).toBe(1);
      expect(report.results[0].status).toBe('missing');
      expect(report.results[0].explanation).toContain('rejected');
    });

    it('excludes superseded facts when a replacement exists', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:leadership',
        key: 'leadership',
        category: 'experience',
        description: 'Engineering team leadership',
      };

      const oldFact = createFact({
        id: 'fact-old',
        profileId: profileA,
        category: 'experience',
        subject: 'leadership',
        claim: 'Led team of 2 engineers',
        verificationState: 'confirmed',
        supersededBy: 'fact-new',
      });

      const newFact = createFact({
        id: 'fact-new',
        profileId: profileA,
        category: 'experience',
        subject: 'leadership',
        claim: 'Led team of 8 engineers across 2 squads',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [oldFact, newFact],
      });

      expect(report.summary.satisfied).toBe(1);
      expect(report.results[0].matchingFactIds).toEqual([newFact.id]);
      expect(report.results[0].matchingFactIds).not.toContain('fact-old');
    });

    it('detects CONFLICTING facts when contradictory claims exist', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:years_go',
        key: 'go_experience',
        category: 'experience',
        description: 'Years of Go experience',
      };

      const fact1 = createFact({
        id: 'fact-1',
        profileId: profileA,
        category: 'experience',
        subject: 'go_experience',
        claim: '2 years of Go experience at Startup',
        structured: { years: 2 },
        verificationState: 'confirmed',
      });

      const fact2 = createFact({
        id: 'fact-2',
        profileId: profileA,
        category: 'experience',
        subject: 'go_experience',
        claim: '5 years of Go experience at BigCorp',
        structured: { years: 5 },
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [fact1, fact2],
      });

      expect(report.summary.conflicting).toBe(1);
      expect(report.results[0].status).toBe('conflicting');
      expect(report.results[0].conflictingFactIds).toBeDefined();
    });

    it('marks ambiguous / deferred requirements as UNSUPPORTED', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:ambiguous_culture',
        key: 'culture_vibes',
        category: 'experience',
        description: 'Has positive vibes and high energy',
        extractionStatus: 'ambiguous',
      };

      const fact = createFact({
        profileId: profileA,
        category: 'experience',
        subject: 'culture_vibes',
        claim: 'Friendly team player',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [fact],
      });

      expect(report.summary.unsupported).toBe(1);
      expect(report.results[0].status).toBe('unsupported');
    });
  });

  describe('Evidence Awareness (Evidence alone NEVER satisfies)', () => {
    it('links supporting evidence as context, but does NOT satisfy unconfirmed requirements', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:rust',
        key: 'rust',
        category: 'skill',
        description: 'Rust systems programming',
      };

      const unconfirmedFact = createFact({
        id: 'fact-rust',
        profileId: profileA,
        category: 'skill',
        subject: 'Rust',
        claim: 'Built CLI tools in Rust',
        verificationState: 'needs_confirmation',
      });

      const evidence: CareerEvidence = {
        id: 'ev-github-rust',
        profileId: profileA,
        sourceType: 'github',
        sourceRef: 'rust-project-repo',
        excerpt: 'GitHub repository: tr3cyos/rust-indexer',
        capturedAt: '2026-01-01T00:00:00.000Z',
      };

      const link: FactEvidenceLink = {
        factId: 'fact-rust',
        evidenceId: 'ev-github-rust',
        relation: 'supports',
      };

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [unconfirmedFact],
        evidence: [evidence],
        links: [link],
      });

      // Crucial: status must remain UNCERTAIN despite evidence existing!
      expect(report.results[0].status).toBe('uncertain');
      expect(report.results[0].matchingEvidenceIds).toContain('ev-github-rust');
      expect(report.summary.satisfied).toBe(0);
    });

    it('returns MISSING with linked evidence if only standalone evidence exists without any CareerFact', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:graphql',
        key: 'graphql',
        category: 'skill',
        description: 'GraphQL API design',
      };

      const evidence: CareerEvidence = {
        id: 'ev-graphql',
        profileId: profileA,
        sourceType: 'github',
        sourceRef: 'graphql-backend',
        excerpt: 'GraphQL schema and resolver implementations',
        capturedAt: '2026-01-01T00:00:00.000Z',
      };

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [],
        evidence: [evidence],
      });

      expect(report.results[0].status).toBe('missing');
      expect(report.results[0].matchingEvidenceIds).toContain('ev-graphql');
      expect(report.summary.satisfied).toBe(0);
    });
  });

  describe('Profile Isolation', () => {
    it('strictly isolates facts between profiles (Profile B facts cannot satisfy Profile A requirements)', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:python',
        key: 'python',
        category: 'skill',
        description: 'Python backend development',
      };

      // Confirmed fact belonging to Profile B
      const factB = createFact({
        profileId: profileB,
        category: 'skill',
        subject: 'Python',
        claim: '10 years Python developer',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [factB],
      });

      expect(report.summary.satisfied).toBe(0);
      expect(report.summary.missing).toBe(1);
      expect(report.results[0].matchingFactIds).toEqual([]);
    });
  });

  describe('Repeatability & Determinism', () => {
    it('produces identical match reports when executed multiple times on identical inputs', () => {
      const requirement: JDRequirement = {
        id: 'req:job1:docker',
        key: 'docker',
        category: 'skill',
        description: 'Docker containerization',
      };

      const fact = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'Docker',
        claim: 'Containerized microservices with Docker',
        verificationState: 'confirmed',
      });

      const fixedClock = () => '2026-10-02T12:00:00.000Z';

      const report1 = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [fact],
        clock: fixedClock,
      });

      const report2 = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [fact],
        clock: fixedClock,
      });

      expect(report1).toEqual(report2);
    });
  });

  describe('Question Engine & Resume Projection Integration', () => {
    it('converts unresolved match results into KnowledgeRequirements and KnowledgeGaps for Question Engine', () => {
      const reqSatisfied: JDRequirement = {
        id: 'req:job:ts',
        key: 'typescript',
        category: 'skill',
        description: 'TypeScript proficiency',
      };

      const reqMissing: JDRequirement = {
        id: 'req:job:k8s',
        key: 'kubernetes',
        category: 'skill',
        description: 'Kubernetes cluster operations',
      };

      const factTS = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'TypeScript engineer',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [reqSatisfied, reqMissing],
        facts: [factTS],
      });

      const unresolved = getUnresolvedRequirements(report);
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0].key).toBe('kubernetes');

      const gaps = convertMatchResultsToGaps(report, [factTS]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].requirementKey).toBe('kubernetes');
      expect(gaps[0].type).toBe('missing');
    });

    it('extracts eligible confirmed fact IDs for later Resume tailoring without modifying projection behavior', () => {
      const req1: JDRequirement = {
        id: 'req:job:ts',
        key: 'typescript',
        category: 'skill',
        description: 'TypeScript proficiency',
      };

      const req2: JDRequirement = {
        id: 'req:job:react',
        key: 'react',
        category: 'skill',
        description: 'React UI development',
      };

      const fact1 = createFact({
        id: 'fact-ts-1',
        profileId: profileA,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'TypeScript engineer',
        verificationState: 'confirmed',
      });

      const fact2 = createFact({
        id: 'fact-react-1',
        profileId: profileA,
        category: 'skill',
        subject: 'React',
        claim: 'React frontend developer',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [req1, req2],
        facts: [fact1, fact2],
      });

      const eligibleIds = getEligibleConfirmedFactIds(report);
      expect(eligibleIds).toEqual(expect.arrayContaining(['fact-ts-1', 'fact-react-1']));
      expect(eligibleIds).toHaveLength(2);
    });

    it('handles stale-state transitions dynamically on re-matching', () => {
      const req: JDRequirement = {
        id: 'req:job:go',
        key: 'go',
        category: 'skill',
        description: 'Go backend',
      };

      const initialFact = createFact({
        id: 'fact-go',
        profileId: profileA,
        category: 'skill',
        subject: 'Go',
        claim: 'Go developer',
        verificationState: 'needs_confirmation',
      });

      const initialReport = matchJDRequirements({
        profileId: profileA,
        requirements: [req],
        facts: [initialFact],
      });
      expect(initialReport.results[0].status).toBe('uncertain');

      // User confirms fact
      const updatedFact: CareerFact = {
        ...initialFact,
        verificationState: 'confirmed',
      };

      const refreshedReport = matchJDRequirements({
        profileId: profileA,
        requirements: [req],
        facts: [updatedFact],
      });
      expect(refreshedReport.results[0].status).toBe('satisfied');
    });
  });

  describe('Safety & No Suitability Scores Invariant', () => {
    it('never outputs match score percentages, hiring predictions, or suitability judgments', () => {
      const requirement: JDRequirement = {
        id: 'req:job:ts',
        key: 'typescript',
        category: 'skill',
        description: 'TypeScript proficiency',
      };

      const fact = createFact({
        profileId: profileA,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'TypeScript engineer',
        verificationState: 'confirmed',
      });

      const report = matchJDRequirements({
        profileId: profileA,
        requirements: [requirement],
        facts: [fact],
      });

      const serialized = JSON.stringify(report);
      expect(serialized).not.toContain('matchScore');
      expect(serialized).not.toContain('candidateScore');
      expect(serialized).not.toContain('fit');
      expect(serialized).not.toContain('hireability');
      expect(serialized).not.toContain('ranking');

      // Only factual summary counts
      expect(report.summary).toEqual({
        total: 1,
        satisfied: 1,
        uncertain: 0,
        missing: 0,
        conflicting: 0,
        unsupported: 0,
      });
    });
  });
});
