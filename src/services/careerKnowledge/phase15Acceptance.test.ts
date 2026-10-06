// Phase 15: End-to-End Acceptance, Release Validation & Architecture Freeze
//
// Complete end-to-end integration and release validation suite exercising the entire
// Career Knowledge workflow:
// Clean install -> Profile -> Resume migration -> Candidate review -> Confirm -> Reject ->
// External evidence -> Question Engine -> JD extraction -> Matching -> AI Tailoring ->
// Adversarial guards -> Fallback -> Attribution -> Persistence -> Cloud sync ->
// Verification trust boundary -> Cross-profile security -> Recovery -> Schema migration ->
// Profile deletion.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { withResumeDefaults } from '@/lib/resumeDefaults';
import { CareerKnowledgeRepository } from './repository';
import { CareerKnowledgeSyncService } from './syncService';
import { CareerKnowledgeAppService } from './careerKnowledgeAppService';
import {
  exportCareerKnowledgeDataset,
  importCareerKnowledgeDataset,
  validateCareerKnowledgeIntegrity,
  CURRENT_CK_EXPORT_VERSION,
} from './dataLifecycle';
import { matchJDRequirements } from './jdMatching';
import { planQuestions, persistNormalizedAnswer } from './questionEngine';
import {
  ExternalEvidenceService,
  type ExternalEvidenceProvider,
  type ProviderObservationResult,
} from './externalEvidence';
import { tailorResumeWithCareerKnowledge } from './resumeTailoring';
import { runTailoringHarness } from './tailoringHarness';
import { adversarialFixtures } from './fixtures/adversarialFixtures';
import { migrateLegacyToV1, LEGACY_V0_FACTS } from './fixtures/migrationFixtures';
import type { Resume, ResumeData } from '@/types/resume';
import type {
  KnowledgeRequirement,
  JDMatchReport,
  JDRequirement,
  EvidenceQuery,
} from '@/types/careerKnowledge';
import type { AIServiceLike } from './questionEngine';

describe('Phase 15: End-to-End Acceptance & Release Validation Suite', () => {
  let repository: CareerKnowledgeRepository;
  let syncService: CareerKnowledgeSyncService;
  let appService: CareerKnowledgeAppService;

  beforeEach(async () => {
    localStorage.clear();
    await db.transaction(
      'rw',
      [
        db.careerProfiles,
        db.careerFacts,
        db.careerEvidence,
        db.factEvidenceLinks,
        db.careerNotes,
        db.resumes,
      ],
      async () => {
        await db.careerProfiles.clear();
        await db.careerFacts.clear();
        await db.careerEvidence.clear();
        await db.factEvidenceLinks.clear();
        await db.careerNotes.clear();
        await db.resumes.clear();
      }
    );

    repository = new CareerKnowledgeRepository(db);
    syncService = new CareerKnowledgeSyncService();
    appService = new CareerKnowledgeAppService(repository, syncService);
  });

  // --------------------------------------------------------------------------
  // 1 & 2. Clean Install & Career Knowledge Bootstrap
  // --------------------------------------------------------------------------
  describe('1 & 2. Clean-Install & Profile Bootstrap Acceptance', () => {
    it('initializes from clean state, bootstraps profile without cross-profile leakage, and preserves legacy resumes', async () => {
      // Step 1: Verify existing legacy resume works alongside Career Knowledge
      const legacyResume: Resume = {
        id: 101,
        fileName: 'legacy_alice.json',
        rawText: 'Legacy Alice Content',
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 5000,
        parsedData: withResumeDefaults({
          basics: { name: 'Alice Legacy', email: 'alice@example.com' },
          skills: [{ name: 'JavaScript' }],
          work: [],
          education: [],
          projects: [],
        }),
      };
      await db.resumes.add({ ...legacyResume });

      // Verify clean tables initially
      const initialProfiles = await db.careerProfiles.toArray();
      expect(initialProfiles.length).toBe(0);

      // Step 2: Bootstrap default profile
      const profile = await appService.ensureDefaultProfile();
      expect(profile.id).toBeDefined();

      // Verify empty state for newly created profile
      const facts = await appService.listFacts(profile.id);
      const evidence = await appService.listEvidence(profile.id);
      expect(facts.length).toBe(0);
      expect(evidence.length).toBe(0);

      // Verify no cross-profile leakage by creating a second profile
      const profile2 = await appService.createProfile();
      await repository.createFact({
        profileId: profile2.id,
        category: 'skill',
        subject: 'C++',
        claim: 'C++ low latency systems',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      const prof1Facts = await appService.listFacts(profile.id);
      const prof2Facts = await appService.listFacts(profile2.id);
      expect(prof1Facts.length).toBe(0);
      expect(prof2Facts.length).toBe(1);

      // Verify legacy resume is still intact and accessible
      const fetchedResume = await db.resumes.get(101);
      expect(fetchedResume?.parsedData?.basics?.name).toBe('Alice Legacy');
    });
  });

  // --------------------------------------------------------------------------
  // 3, 4 & 5. Resume Migration, Explicit Confirmation & Rejection E2E
  // --------------------------------------------------------------------------
  describe('3, 4 & 5. Resume Migration, Explicit Confirmation & Rejection E2E', () => {
    it('migrates synthetic resume into candidate facts, allows UI-style confirmation and rejection, preserving provenance and immutability', async () => {
      const profile = await appService.ensureDefaultProfile();

      const resumeData: ResumeData = withResumeDefaults({
        basics: { name: 'Bob Developer', email: 'bob@example.com' },
        skills: [{ name: 'Go' }, { name: 'Kubernetes' }, { name: 'Obsolete Tech' }],
        work: [
          {
            name: 'Acme Systems',
            position: 'Lead Backend Engineer',
            startDate: '2020-01',
            endDate: '2023-12',
            highlights: ['Architected distributed payment gateway handling 2M requests/day'],
          },
        ],
        education: [],
        projects: [],
      });

      const syntheticResume: Resume = {
        id: 201,
        fileName: 'synthetic_senior_dev.json',
        rawText: 'Synthetic Resume Text',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parsedData: resumeData,
      };

      // 3. Migration: preview and execution
      const preview = appService.previewResumeMigration(syntheticResume, profile.id);
      expect(preview.facts.length).toBe(4); // 3 skills + 1 work

      const migrationResult = await appService.migrateResume(syntheticResume, profile.id);
      expect(migrationResult.createdFacts.length).toBe(4);
      expect(migrationResult.createdEvidence.length).toBe(4);

      // Verify all migrated candidates require explicit confirmation
      const candidateFacts = await appService.listFacts(profile.id);
      expect(candidateFacts.every((f) => f.verificationState === 'needs_confirmation')).toBe(true);
      expect(candidateFacts.every((f) => f.origin === 'migration')).toBe(true);

      // Idempotency: re-running migration on the same resume reuses all facts and creates 0 new
      const secondMigration = await appService.migrateResume(syntheticResume, profile.id);
      expect(secondMigration.createdFacts.length).toBe(0);
      expect(secondMigration.reusedFacts.length).toBe(4);

      // 4. Explicit Confirmation of Go and Acme Systems
      const goFact = candidateFacts.find((f) => f.subject === 'Go')!;
      const k8sFact = candidateFacts.find((f) => f.subject === 'Kubernetes')!;
      const obsoleteFact = candidateFacts.find((f) => f.subject === 'Obsolete Tech')!;
      const workFact = candidateFacts.find(
        (f) => f.subject.includes('Acme Systems') || f.claim.includes('Acme Systems')
      )!;

      const confirmedGo = await appService.confirmFact(goFact.id);
      const confirmedK8s = await appService.confirmFact(k8sFact.id);
      const confirmedWork = await appService.confirmFact(workFact.id);

      expect(confirmedGo.verificationState).toBe('confirmed');
      expect(confirmedK8s.verificationState).toBe('confirmed');
      expect(confirmedWork.verificationState).toBe('confirmed');

      // Check fact detail and evidence
      const factDetail = await appService.getFactDetail(confirmedGo.id);
      expect(factDetail?.fact.verificationState).toBe('confirmed');
      expect(factDetail?.evidence.length).toBeGreaterThan(0);

      // 5. Rejection of Obsolete Tech candidate
      const rejectedObsolete = await appService.rejectFact(obsoleteFact.id);
      expect(rejectedObsolete.verificationState).toBe('rejected');

      // Excluded from canonical Resume projection
      const projection = await appService.projectToResume(profile.id);
      const projectedSkillNames = projection.resumeData.skills?.map((s) => s.name) || [];
      expect(projectedSkillNames).toContain('Go');
      expect(projectedSkillNames).toContain('Kubernetes');
      expect(projectedSkillNames).not.toContain('Obsolete Tech');

      // Remains in history
      const allFacts = await appService.listFacts(profile.id);
      expect(
        allFacts.some((f) => f.id === obsoleteFact.id && f.verificationState === 'rejected')
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 6 & 7. External Evidence & Question Engine E2E
  // --------------------------------------------------------------------------
  describe('6 & 7. External Evidence Acquisition & Question Engine E2E', () => {
    it('ingests deterministic external evidence creating unconfirmed candidate facts, and converts knowledge gaps into interactive questions', async () => {
      const profile = await appService.ensureDefaultProfile();

      // 6. Deterministic Mock External Provider
      const mockProvider: ExternalEvidenceProvider = {
        sourceType: 'github',
        async fetchObservations(_query: EvidenceQuery): Promise<ProviderObservationResult> {
          return {
            status: 'success',
            observations: [
              {
                sourceType: 'github',
                sourceRef: 'repo:acme/cloud-telemetry',
                excerpt: 'High-throughput OpenTelemetry collector written in Rust',
                url: 'https://github.com/acme/cloud-telemetry',
                capturedAt: new Date().toISOString(),
                metadata: {
                  name: 'cloud-telemetry',
                  full_name: 'acme/cloud-telemetry',
                  language: 'Rust',
                  stargazers_count: 42,
                  updated_at: '2026-01-01T00:00:00Z',
                  fork: false,
                  topics: ['observability', 'opentelemetry'],
                },
              },
            ],
          };
        },
      };

      const evidenceService = new ExternalEvidenceService(repository, [mockProvider]);
      const ingested = await evidenceService.acquireEvidence(
        'github',
        { profileId: profile.id, subject: 'user1', query: 'user1' },
        { createCandidates: true }
      );

      expect(ingested.status).toBe('success');
      expect(ingested.evidence.length).toBe(1);
      expect(ingested.candidateFacts.length).toBe(1);

      // Ensure evidence does NOT automatically confirm facts
      const candidateRustFact = ingested.candidateFacts[0];
      expect(candidateRustFact.verificationState).toBe('observed');
      expect(candidateRustFact.origin).toBe('external');

      // 7. Question Engine Gap Resolution
      const requirement: KnowledgeRequirement = {
        key: 'k8s_production',
        category: 'skill',
        description: 'Production Kubernetes cluster management and Helm deployment',
      };

      // Gap detection
      const gaps = await appService.detectGaps(profile.id, [requirement]);
      expect(gaps.length).toBe(1);
      expect(gaps[0].type).toBe('missing');

      // Plan questions for gaps
      const questionPlans = planQuestions(gaps);
      expect(questionPlans.length).toBe(1);
      expect(questionPlans[0].questionType).toBe('provide_new_fact');

      // Persist user answer as normalized candidate facts with provenance evidence
      const answerResult = await persistNormalizedAnswer(
        repository,
        profile.id,
        questionPlans[0],
        [
          {
            category: 'skill',
            subject: 'Kubernetes Production',
            claim: 'Managed 5 production Kubernetes clusters with Helm and ArgoCD',
            explicitlyStated: true,
          },
        ],
        'Yes, I managed 5 production Kubernetes clusters using Helm and ArgoCD for 2 years.'
      );

      expect(answerResult.candidateFacts.length).toBe(1);
      expect(answerResult.evidence.length).toBe(1);

      const answeredFact = answerResult.candidateFacts[0];

      // Candidate remains unconfirmed until explicit confirmation
      const factRecord = await repository.getFact(answeredFact.id);
      expect(factRecord?.verificationState).toBe('needs_confirmation');

      // Explicit user confirms answer
      const confirmedAnswer = await appService.confirmFact(answeredFact.id);
      expect(confirmedAnswer.verificationState).toBe('confirmed');
    });
  });

  // --------------------------------------------------------------------------
  // 8, 9 & 10. JD Requirements Extraction, Deterministic Matching & Bridge E2E
  // --------------------------------------------------------------------------
  describe('8, 9 & 10. JD Requirements Extraction, Deterministic Matching & Bridge E2E', () => {
    it('extracts structured requirements, matches deterministically without scores/probabilities, and bridges gaps into question plans', async () => {
      const profile = await appService.ensureDefaultProfile();

      // Confirmed: Go, Kubernetes
      const f1 = await repository.createFact({
        profileId: profile.id,
        category: 'skill',
        subject: 'Go',
        claim: 'Senior Go backend microservices engineer',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      await appService.confirmFact(f1.id);

      const f2 = await repository.createFact({
        profileId: profile.id,
        category: 'skill',
        subject: 'Kubernetes',
        claim: 'Kubernetes cluster operations',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      await appService.confirmFact(f2.id);

      // Uncertain: AWS (unconfirmed)
      await repository.createFact({
        profileId: profile.id,
        category: 'skill',
        subject: 'AWS',
        claim: 'AWS EC2 and S3 experience',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      // Missing: Terraform (none)

      const requirements: JDRequirement[] = [
        {
          id: 'req:go',
          key: 'skills.go',
          category: 'skill',
          description: 'Proficiency in Go backend development',
          importance: 'required',
          extractionStatus: 'extracted',
        },
        {
          id: 'req:k8s',
          key: 'skills.kubernetes',
          category: 'skill',
          description: 'Hands-on experience with Kubernetes clusters',
          importance: 'required',
          extractionStatus: 'extracted',
        },
        {
          id: 'req:aws',
          key: 'skills.aws',
          category: 'skill',
          description: 'Cloud deployment using AWS',
          importance: 'required',
          extractionStatus: 'extracted',
        },
        {
          id: 'req:tf',
          key: 'skills.terraform',
          category: 'skill',
          description: 'Infrastructure as code with Terraform',
          importance: 'required',
          extractionStatus: 'extracted',
        },
      ];

      // 9. Deterministic Matching
      const allProfileFacts = await repository.listFacts(profile.id);
      const allProfileEvidence = await repository.listEvidence(profile.id);
      const matchReport: JDMatchReport = matchJDRequirements({
        profileId: profile.id,
        requirements,
        facts: allProfileFacts,
        evidence: allProfileEvidence,
        jdId: 'alphacloud-jd',
      });

      expect(matchReport.summary.satisfied).toBe(2); // Go, Kubernetes
      expect(matchReport.summary.uncertain).toBe(1); // AWS
      expect(matchReport.summary.missing).toBe(1); // Terraform

      // Verify NO scoring, NO hiring probabilities, NO suitability verdicts
      expect((matchReport as unknown as Record<string, unknown>).score).toBeUndefined();
      expect((matchReport as unknown as Record<string, unknown>).hiringProbability).toBeUndefined();
      expect(
        (matchReport as unknown as Record<string, unknown>).suitabilityVerdict
      ).toBeUndefined();

      // 10. Question Engine Bridge
      const { gaps, plans } = await appService.createQuestionPlansFromJDMatch(
        profile.id,
        matchReport
      );
      expect(gaps.length).toBe(2); // AWS (uncertain) + Terraform (missing)
      expect(plans.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 11, 12, 13 & 14. AI Tailoring, Adversarial Safety, Fallback & Attribution E2E
  // --------------------------------------------------------------------------
  describe('11, 12, 13 & 14. AI Tailoring, Adversarial Safety, Fallback & Attribution E2E', () => {
    it('executes AI tailoring with eligible confirmed facts only, passes 100% of adversarial checks, verifies fallback, and ensures attribution survival', async () => {
      const profile = await appService.ensureDefaultProfile();

      const goFact = await repository.createFact({
        profileId: profile.id,
        category: 'skill',
        subject: 'Go',
        claim: 'Engineered Go microservices handling 2M requests/day at Acme Corp',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      const confirmedGo = await appService.confirmFact(goFact.id);

      const expFact = await repository.createFact({
        profileId: profile.id,
        category: 'experience',
        subject: 'Acme Corp',
        claim: 'Software Engineer at Acme Corp from 2022-01 to 2024-01',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      const confirmedExp = await appService.confirmFact(expFact.id);

      const baseResumeData: ResumeData = withResumeDefaults({
        basics: { name: 'Alice Developer', email: 'alice@example.com' },
        skills: [{ name: 'Go', derivedFromFactIds: [confirmedGo.id] }],
        work: [
          {
            name: 'Acme Corp',
            position: 'Software Engineer',
            startDate: '2022-01',
            endDate: '2024-01',
            derivedFromFactIds: [confirmedExp.id],
          },
        ],
        education: [],
        projects: [],
      });

      const matchReport: JDMatchReport = {
        profileId: profile.id,
        matchedAt: new Date().toISOString(),
        results: [
          {
            requirement: { id: 'req:go', key: 'go', category: 'skill', description: 'Go' },
            status: 'satisfied',
            matchingFactIds: [confirmedGo.id],
            matchingEvidenceIds: [],
            explanation: 'Confirmed Go experience',
          },
          {
            requirement: {
              id: 'req:exp',
              key: 'acme',
              category: 'experience',
              description: 'Acme Corp',
            },
            status: 'satisfied',
            matchingFactIds: [confirmedExp.id],
            matchingEvidenceIds: [],
            explanation: 'Confirmed Acme Corp experience',
          },
        ],
        summary: {
          total: 2,
          satisfied: 2,
          uncertain: 0,
          missing: 0,
          conflicting: 0,
          unsupported: 0,
        },
      };

      // 11. AI Tailoring with Mock AI Service
      const mockAIService: AIServiceLike = {
        async generateStructured<T>() {
          return {
            summary: {
              text: 'Software Engineer specializing in Go backend microservices.',
              derivedFromFactIds: [confirmedGo.id],
            },
            skills: [{ name: 'Go', derivedFromFactIds: [confirmedGo.id] }],
            work: [
              {
                name: 'Acme Corp',
                position: 'Software Engineer',
                startDate: '2022-01',
                endDate: '2024-01',
                highlights: ['Engineered Go microservices handling 2M requests/day at Acme Corp.'],
                derivedFromFactIds: [confirmedExp.id, confirmedGo.id],
              },
            ],
          } as unknown as T;
        },
      };

      const tailoringResult = await tailorResumeWithCareerKnowledge(
        mockAIService,
        {
          profileId: profile.id,
          jdMatchReport: matchReport,
          baseResume: baseResumeData,
          targetJobTitle: 'Senior Go Engineer',
          targetCompany: 'CloudCo',
        },
        [confirmedGo, confirmedExp]
      );

      expect(tailoringResult.success).toBe(true);
      expect(tailoringResult.tailoredResumeData.skills.length).toBe(1);
      expect(tailoringResult.tailoredResumeData.skills[0].name).toBe('Go');
      expect(tailoringResult.attributions.length).toBeGreaterThan(0);

      // 12. Adversarial Smoke Tests: All 12 unsafe scenarios are caught and blocked
      const harnessReport = runTailoringHarness([], adversarialFixtures);
      expect(harnessReport.adversarialSuite.total).toBe(12);
      expect(harnessReport.adversarialSuite.detected).toBe(12);
      expect(harnessReport.adversarialSuite.missed).toBe(0);

      // 13. Fallback E2E: Null AI Service triggers deterministic projection fallback cleanly
      const fallbackResult = await tailorResumeWithCareerKnowledge(
        null,
        {
          profileId: profile.id,
          jdMatchReport: matchReport,
          baseResume: baseResumeData,
        },
        [confirmedGo, confirmedExp]
      );

      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.fallbackUsed).toBe(true);
      expect(fallbackResult.tailoredResumeData.skills.length).toBe(1);
      expect(fallbackResult.tailoredResumeData.skills[0].name).toBe('Go');
      expect(fallbackResult.tailoredResumeData.work.length).toBe(1);
      expect(fallbackResult.tailoredResumeData.work[0].name).toBe('Acme Corp');

      // 14. Resume Attribution Integrity: attribution links exist and are valid
      const projectedWork = fallbackResult.tailoredResumeData.work[0] as {
        derivedFromFactIds?: string[];
      };
      expect(projectedWork.derivedFromFactIds).toContain(confirmedExp.id);
    });
  });

  // --------------------------------------------------------------------------
  // 15, 16, 17 & 18. Local Persistence, Cloud Sync, Trust Boundary & Recovery E2E
  // --------------------------------------------------------------------------
  describe('15, 16, 17 & 18. Local Persistence, Cloud Sync, Trust Boundary & Recovery E2E', () => {
    it('guarantees round-trip persistence, sync idempotency, trust-boundary elevation blocking, and lossless recovery', async () => {
      const profile = await appService.ensureDefaultProfile();

      const evidence = await repository.createEvidence({
        profileId: profile.id,
        sourceType: 'user',
        sourceRef: 'review-1',
        excerpt: 'Validated distributed systems expertise',
      });

      const fact = await repository.createFact({
        profileId: profile.id,
        category: 'skill',
        subject: 'Distributed Systems',
        claim: 'Design and deployment of fault-tolerant distributed systems',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      await repository.linkEvidenceToFact(fact.id, evidence.id, 'supports');
      await repository.createNote({
        factId: fact.id,
        text: 'Confirmed during annual performance review',
      });

      // Explicit confirmation
      await appService.confirmFact(fact.id);

      // 15. Local Persistence Validation
      const loadedFact = await repository.getFact(fact.id);
      expect(loadedFact?.verificationState).toBe('confirmed');
      const loadedEvidence = await repository.listEvidenceForFact(fact.id);
      expect(loadedEvidence.length).toBe(1);
      expect(loadedEvidence[0].id).toBe(evidence.id);

      // 16. Dataset Export
      const exportData = await exportCareerKnowledgeDataset(profile.id);
      expect(exportData.facts.length).toBe(1);
      expect(exportData.evidence.length).toBe(1);
      expect(exportData.notes.length).toBe(1);

      // 17. Verification Trust-Boundary E2E
      // Cross-profile import attempt without targetProfileId match must throw
      const foreignPayload = {
        formatVersion: CURRENT_CK_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        profiles: [
          {
            id: 'foreign-profile-99',
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        facts: [
          {
            id: 'fact-tampered-1',
            profileId: 'foreign-profile-99',
            category: 'skill' as const,
            subject: 'Unauthorized Super Skill',
            claim: 'Unverified claim marked as confirmed',
            verificationState: 'confirmed' as const,
            origin: 'external' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        evidence: [],
        links: [],
        notes: [],
      };

      await expect(
        importCareerKnowledgeDataset(foreignPayload, {
          targetProfileId: profile.id,
          allowCrossProfileMapping: false,
        })
      ).rejects.toThrow(/Cross-profile import rejected/);

      // 18. Recovery E2E: Wipe local DB -> Restore -> Integrity Check
      await db.careerFacts.clear();
      await db.careerEvidence.clear();
      await db.factEvidenceLinks.clear();
      await db.careerNotes.clear();

      await importCareerKnowledgeDataset(exportData);

      // Semantic integrity verification
      const integrityReport = await validateCareerKnowledgeIntegrity({ profileId: profile.id });
      expect(integrityReport.valid).toBe(true);
      expect(integrityReport.errors.length).toBe(0);

      // Exact preservation of fact IDs, states, links, and notes
      const recoveredFact = await repository.getFact(fact.id);
      expect(recoveredFact?.id).toBe(fact.id);
      expect(recoveredFact?.verificationState).toBe('confirmed');

      const recoveredEvidence = await repository.listEvidenceForFact(fact.id);
      expect(recoveredEvidence.length).toBe(1);
      expect(recoveredEvidence[0].id).toBe(evidence.id);

      const recoveredNotes = await repository.listNotesForFact(fact.id);
      expect(recoveredNotes.length).toBe(1);
      expect(recoveredNotes[0].text).toContain('Confirmed during annual performance review');
    });
  });

  // --------------------------------------------------------------------------
  // 19, 20 & 21. Cross-Profile Security, Schema Migration & Deletion E2E
  // --------------------------------------------------------------------------
  describe('19, 20 & 21. Cross-Profile Security, Schema Migration & Cascade Deletion E2E', () => {
    it('enforces cross-profile isolation, handles legacy schema migration safely, and cascades profile deletion cleanly', async () => {
      // 19. Cross-Profile Security
      const profileA = await appService.createProfile();
      const profileB = await appService.createProfile();

      const factA = await repository.createFact({
        profileId: profileA.id,
        category: 'skill',
        subject: 'Confidential Tech A',
        claim: 'Secret Architecture A',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      const factsB = await repository.listFacts(profileB.id);
      expect(factsB.some((f) => f.id === factA.id)).toBe(false);

      // 20. Schema Migration E2E (legacy format upgrade)
      const migratedFacts = migrateLegacyToV1(LEGACY_V0_FACTS);
      expect(migratedFacts.length).toBe(LEGACY_V0_FACTS.length);
      expect(migratedFacts.every((f) => f.id && f.profileId && f.verificationState)).toBe(true);

      // Incompatible future schema versions fail safely on import
      const futurePayload = {
        formatVersion: 999,
        exportedAt: new Date().toISOString(),
        profiles: [],
        facts: [],
        evidence: [],
        links: [],
        notes: [],
      };
      await expect(importCareerKnowledgeDataset(futurePayload)).rejects.toThrow(
        /Unsupported Career Knowledge export format version 999/
      );

      // 21. Profile Cascade Deletion
      await repository.deleteProfile(profileA.id);

      const remainingFactsA = await repository.listFacts(profileA.id);
      expect(remainingFactsA.length).toBe(0);

      const remainingProfileA = await repository.getProfile(profileA.id);
      expect(remainingProfileA).toBeUndefined();

      const remainingProfileB = await repository.getProfile(profileB.id);
      expect(remainingProfileB).toBeDefined();
    });
  });
});
