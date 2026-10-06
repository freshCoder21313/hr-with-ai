import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  CareerFact,
  JDMatchReport,
  TailorResumeWithCareerKnowledgeRequest,
} from '@/types/careerKnowledge';
import type { ResumeData } from '@/types/resume';
import {
  getAuthorizedConfirmedFacts,
  validateTailoringAIResponse,
  tailorResumeWithCareerKnowledge,
} from './resumeTailoring';

import { careerKnowledgeAppService } from './careerKnowledgeAppService';
import { careerKnowledgeRepository } from './repository';
import { matchJDRequirements } from './jdMatching';
import { db } from '@/lib/db';
import type { AIServiceLike } from './questionEngine';
import type { ResumeTailoringAIResponse } from './schemas';

describe('Phase 11: AI-Assisted Resume Tailoring', () => {
  const PROFILE_A = 'profile-user-alpha';
  const PROFILE_B = 'profile-user-beta';

  const mockFactGo: CareerFact = {
    id: 'fact-go-1',
    profileId: PROFILE_A,
    category: 'skill',
    subject: 'Go',
    claim:
      '5 years of backend engineering experience developing high-concurrency microservices in Go handling 2M requests/day',
    structured: { skill: 'Go', years: 5, level: 'Senior' },
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
    claim: 'Senior Backend Engineer at Acme Corp leading Go API service modernization',
    structured: {
      company: 'Acme Corp',
      role: 'Senior Backend Engineer',
      startDate: '2021-01',
      endDate: '2025-01',
    },
    verificationState: 'confirmed',
    origin: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockFactK8sUnconfirmed: CareerFact = {
    id: 'fact-k8s-3',
    profileId: PROFILE_A,
    category: 'skill',
    subject: 'Kubernetes',
    claim: 'Observed Kubernetes cluster deployment scripts in GitHub repository',
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

  const mockBaseResume: ResumeData = {
    basics: {
      name: 'Alice Developer',
      email: 'alice@example.com',
      phone: '+1 555 1234',
      label: 'Software Engineer',
      summary: 'Original base summary',
      location: { city: 'Hanoi', countryCode: 'VN' },
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    languages: [
      { language: 'Vietnamese', fluency: 'Native' },
      { language: 'English', fluency: 'Fluent' },
    ],
    meta: {
      template: 'modern',
      theme: 'blue',
    },
  };

  beforeEach(async () => {
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
  });

  describe('1. Source Authorization Boundary', () => {
    it('authorizes only confirmed, active, profile-matched, JD-eligible facts', () => {
      const allFacts = [
        mockFactGo,
        mockFactAcme,
        mockFactK8sUnconfirmed,
        mockFactSuperseded,
        mockFactForeignProfile,
      ];

      const eligibleIds = [
        mockFactGo.id,
        mockFactAcme.id,
        mockFactK8sUnconfirmed.id,
        mockFactSuperseded.id,
        mockFactForeignProfile.id,
      ];
      const { authorizedFacts, unauthorizedReasons } = getAuthorizedConfirmedFacts(
        allFacts,
        PROFILE_A,
        eligibleIds
      );

      // Only Go and Acme Corp are confirmed, active, and belong to PROFILE_A
      expect(authorizedFacts.map((f) => f.id)).toEqual([mockFactGo.id, mockFactAcme.id]);

      // Unconfirmed is flagged
      expect(unauthorizedReasons.get(mockFactK8sUnconfirmed.id)).toBe(
        'unconfirmed_state_needs_confirmation'
      );
      // Superseded is flagged
      expect(unauthorizedReasons.get(mockFactSuperseded.id)).toBe('superseded');
      // Foreign profile is flagged
      expect(unauthorizedReasons.get(mockFactForeignProfile.id)).toBe('foreign_profile');
    });

    it('filters out facts not in the Phase 10 eligible set', () => {
      const allFacts = [mockFactGo, mockFactAcme];
      // Only mockFactGo was deemed eligible by JD matching
      const { authorizedFacts } = getAuthorizedConfirmedFacts(allFacts, PROFILE_A, [mockFactGo.id]);

      expect(authorizedFacts.map((f) => f.id)).toEqual([mockFactGo.id]);
    });
  });

  describe('2. AI Output Validation & Grounding', () => {
    const authorizedFacts = [mockFactGo, mockFactAcme];

    it('accepts valid, faithfully attributed entities and summary', () => {
      const validAIResponse: ResumeTailoringAIResponse = {
        summary: {
          text: 'Backend engineer with confirmed experience building Go microservices.',
          derivedFromFactIds: [mockFactGo.id],
        },
        work: [
          {
            name: 'Acme Corp',
            position: 'Senior Backend Engineer',
            summary: 'Led Go API service modernization',
            highlights: ['Engineered Go services handling 2M requests/day'],
            derivedFromFactIds: [mockFactAcme.id, mockFactGo.id],
          },
        ],
        projects: [],
        skills: [
          {
            name: 'Go',
            keywords: ['Microservices', 'Concurrency'],
            derivedFromFactIds: [mockFactGo.id],
          },
        ],
        education: [],
        awards: [],
      };

      const validated = validateTailoringAIResponse(
        validAIResponse,
        authorizedFacts,
        authorizedFacts,
        PROFILE_A
      );

      expect(validated.summary?.text).toBe(
        'Backend engineer with confirmed experience building Go microservices.'
      );
      expect(validated.work.length).toBe(1);
      expect(validated.work[0].derivedFromFactIds).toEqual([mockFactAcme.id, mockFactGo.id]);
      expect(validated.skills.length).toBe(1);
      expect(validated.skills[0].derivedFromFactIds).toEqual([mockFactGo.id]);
      expect(validated.issues.length).toBe(0);
    });

    it('rejects entities with missing attribution (derivedFromFactIds = [])', () => {
      const missingAttributionResponse: ResumeTailoringAIResponse = {
        work: [
          {
            name: 'Invented Corp',
            position: 'Architect',
            summary: 'Built cloud platforms',
            derivedFromFactIds: [] as string[],
          },
        ],
        projects: [],

        skills: [],
        education: [],
        awards: [],
      };

      const validated = validateTailoringAIResponse(
        missingAttributionResponse,
        authorizedFacts,
        authorizedFacts,
        PROFILE_A
      );

      expect(validated.work.length).toBe(0);
      expect(validated.issues.some((i) => i.kind === 'missing_attribution')).toBe(true);
    });

    it('rejects entities referencing unconfirmed or foreign profile facts', () => {
      const allFacts = [mockFactGo, mockFactAcme, mockFactK8sUnconfirmed, mockFactForeignProfile];
      const invalidFactRefResponse: ResumeTailoringAIResponse = {
        skills: [
          {
            name: 'Kubernetes',
            derivedFromFactIds: [mockFactK8sUnconfirmed.id], // unconfirmed!
          },
          {
            name: 'Rust',
            derivedFromFactIds: [mockFactForeignProfile.id], // foreign profile!
          },
        ],
        work: [],
        projects: [],
        education: [],
        awards: [],
      };

      const validated = validateTailoringAIResponse(
        invalidFactRefResponse,
        authorizedFacts,
        allFacts,
        PROFILE_A
      );

      expect(validated.skills.length).toBe(0);
      expect(validated.issues.some((i) => i.kind === 'unconfirmed_fact')).toBe(true);
      expect(validated.issues.some((i) => i.kind === 'foreign_profile_fact')).toBe(true);
    });

    it('detects and rejects metric inflation (e.g. 2M -> 20M, 99.99% uptime)', () => {
      const inflatedResponse: ResumeTailoringAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Senior Backend Engineer',
            summary: 'Managed Go microservices',
            highlights: ['Scaled platform to 20M requests/day with 99.99% uptime'], // 20M and 99.99% not in fact claim!
            derivedFromFactIds: [mockFactAcme.id, mockFactGo.id],
          },
        ],
        projects: [],
        skills: [],
        education: [],
        awards: [],
      };

      const validated = validateTailoringAIResponse(
        inflatedResponse,
        authorizedFacts,
        authorizedFacts,
        PROFILE_A
      );

      expect(validated.work.length).toBe(0);
      expect(validated.issues.some((i) => i.kind === 'metric_inflation')).toBe(true);
    });
  });

  describe('3. Requirement Alignment & Non-Claim of Missing/Uncertain Skills', () => {
    it('does not authorize missing JD requirements to be claimed in tailored resume', async () => {
      const requirements = [
        {
          id: 'req:1',
          key: 'go',
          category: 'skill',
          description: 'Experience with Go microservices',
          importance: 'required' as const,
        },
        {
          id: 'req:2',
          key: 'terraform',
          category: 'skill',
          description: 'Experience with Terraform IaC',
          importance: 'required' as const,
        },
      ];

      const allFacts = [mockFactGo, mockFactAcme];
      const matchReport = matchJDRequirements({
        profileId: PROFILE_A,
        requirements,
        facts: allFacts,
      });

      // Go is satisfied, Terraform is missing
      expect(matchReport.summary.satisfied).toBe(1);
      expect(matchReport.summary.missing).toBe(1);

      // AI attempt trying to claim Terraform without source fact
      const mockAIService: AIServiceLike = {
        generateStructured: vi.fn().mockResolvedValue({
          skills: [
            {
              name: 'Go',
              keywords: ['Microservices'],
              derivedFromFactIds: [mockFactGo.id],
            },
            {
              name: 'Terraform',
              keywords: ['IaC'],
              derivedFromFactIds: ['fake-terraform-fact-id'], // hallucinated fact ID
            },
          ],
          work: [],
          projects: [],
          education: [],
          awards: [],
        }),
      };

      const request: TailorResumeWithCareerKnowledgeRequest = {
        profileId: PROFILE_A,
        jdMatchReport: matchReport,
        baseResume: mockBaseResume,
      };

      const result = await tailorResumeWithCareerKnowledge(mockAIService, request, allFacts);

      expect(result.success).toBe(true);
      // Terraform was rejected because 'fake-terraform-fact-id' is unauthorized
      expect(result.tailoredResumeData.skills.length).toBe(1);
      expect(result.tailoredResumeData.skills[0].name).toBe('Go');
      expect(result.validationIssues.some((i) => i.factId === 'fake-terraform-fact-id')).toBe(true);
    });
  });

  describe('4. Resume-Local Preservation & Non-Mutation', () => {
    it('preserves base resume non-projected fields (contact, languages, meta)', async () => {
      const mockAIService: AIServiceLike = {
        generateStructured: vi.fn().mockResolvedValue({
          work: [
            {
              name: 'Acme Corp',
              position: 'Senior Backend Engineer',
              summary: 'Modernized Go APIs',
              derivedFromFactIds: [mockFactAcme.id],
            },
          ],
          projects: [],
          skills: [],
          education: [],
          awards: [],
        }),
      };

      const matchReport: JDMatchReport = {
        profileId: PROFILE_A,
        matchedAt: new Date().toISOString(),
        results: [
          {
            requirement: { id: 'req:1', key: 'go', category: 'skill', description: 'Go' },
            status: 'satisfied',
            matchingFactIds: [mockFactAcme.id],
            matchingEvidenceIds: [],
            explanation: 'Supported',
          },
        ],
        summary: {
          total: 1,
          satisfied: 1,
          uncertain: 0,
          missing: 0,
          conflicting: 0,
          unsupported: 0,
        },
      };

      const result = await tailorResumeWithCareerKnowledge(
        mockAIService,
        {
          profileId: PROFILE_A,
          jdMatchReport: matchReport,
          baseResume: mockBaseResume,
          targetJobTitle: 'Senior Go Engineer',
          targetCompany: 'Target Tech Co',
        },
        [mockFactAcme]
      );

      expect(result.success).toBe(true);
      // Identity and contact preserved
      expect(result.tailoredResumeData.basics.name).toBe('Alice Developer');
      expect(result.tailoredResumeData.basics.email).toBe('alice@example.com');
      expect(result.tailoredResumeData.basics.phone).toBe('+1 555 1234');
      expect(result.tailoredResumeData.basics.location?.city).toBe('Hanoi');
      // Non-projected sections preserved
      expect(result.tailoredResumeData.languages?.length).toBe(2);
      expect(result.tailoredResumeData.meta?.template).toBe('modern');
      expect(result.tailoredResumeData.meta?.tailoredForJobTitle).toBe('Senior Go Engineer');
      expect(result.tailoredResumeData.meta?.tailoredForJobCompany).toBe('Target Tech Co');
    });

    it('does not mutate original facts, verification states, or source resume', async () => {
      const originalFact = { ...mockFactGo };
      const originalResume = { ...mockBaseResume };

      const mockAIService: AIServiceLike = {
        generateStructured: vi.fn().mockResolvedValue({
          skills: [{ name: 'Go', derivedFromFactIds: [mockFactGo.id] }],
          work: [],
          projects: [],
          education: [],
          awards: [],
        }),
      };

      const matchReport: JDMatchReport = {
        profileId: PROFILE_A,
        matchedAt: new Date().toISOString(),
        results: [
          {
            requirement: { id: 'req:1', key: 'go', category: 'skill', description: 'Go' },
            status: 'satisfied',
            matchingFactIds: [mockFactGo.id],
            matchingEvidenceIds: [],
            explanation: 'Supported',
          },
        ],
        summary: {
          total: 1,
          satisfied: 1,
          uncertain: 0,
          missing: 0,
          conflicting: 0,
          unsupported: 0,
        },
      };

      await tailorResumeWithCareerKnowledge(
        mockAIService,
        {
          profileId: PROFILE_A,
          jdMatchReport: matchReport,
          baseResume: mockBaseResume,
        },
        [mockFactGo]
      );

      // Verify facts are unchanged
      expect(mockFactGo).toEqual(originalFact);
      expect(mockFactGo.verificationState).toBe('confirmed');
      // Verify base resume is unchanged
      expect(mockBaseResume).toEqual(originalResume);
    });
  });

  describe('5. Fallback Behavior on AI Failure', () => {
    it('gracefully falls back to deterministic Phase 6 projection on AI provider error', async () => {
      const failingAIService: AIServiceLike = {
        generateStructured: vi.fn().mockRejectedValue(new Error('AI API connection timeout')),
      };

      const matchReport: JDMatchReport = {
        profileId: PROFILE_A,
        matchedAt: new Date().toISOString(),
        results: [
          {
            requirement: { id: 'req:1', key: 'go', category: 'skill', description: 'Go' },
            status: 'satisfied',
            matchingFactIds: [mockFactGo.id],
            matchingEvidenceIds: [],
            explanation: 'Supported',
          },
        ],
        summary: {
          total: 1,
          satisfied: 1,
          uncertain: 0,
          missing: 0,
          conflicting: 0,
          unsupported: 0,
        },
      };

      const result = await tailorResumeWithCareerKnowledge(
        failingAIService,
        {
          profileId: PROFILE_A,
          jdMatchReport: matchReport,
          baseResume: mockBaseResume,
        },
        [mockFactGo]
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      // Deterministic projection produced the Go skill entity
      expect(result.tailoredResumeData.skills.length).toBe(1);
      expect(result.tailoredResumeData.skills[0].name).toBe('Go');
      expect(
        (result.tailoredResumeData.skills[0] as { derivedFromFactIds?: string[] })
          .derivedFromFactIds
      ).toEqual([mockFactGo.id]);
    });
  });

  describe('6. Persistence & Lineage', () => {
    it('persists tailored draft as a new resume with intact derivedFromFactIds without overwriting existing resumes', async () => {
      // 1. Create a profile and an initial source resume in Dexie
      const profile = await careerKnowledgeRepository.createProfile();
      const sourceResumeId = await db.resumes.add({
        fileName: 'Master Resume.pdf',
        rawText: 'Master resume raw content',
        parsedData: mockBaseResume,
        createdAt: 1000,
        updatedAt: 1000,
        isMain: true,
      });

      const fact = await careerKnowledgeRepository.createFact({
        profileId: profile.id,
        category: 'experience',
        subject: 'Acme Corp',
        claim: 'Senior Backend Engineer at Acme Corp',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });
      const confirmedFact = await careerKnowledgeRepository.confirmFact(fact.id, 'user');

      const matchReport: JDMatchReport = {
        profileId: profile.id,
        matchedAt: new Date().toISOString(),
        results: [
          {
            requirement: {
              id: 'req:1',
              key: 'experience',
              category: 'experience',
              description: 'Backend Exp',
            },
            status: 'satisfied',
            matchingFactIds: [confirmedFact.id],
            matchingEvidenceIds: [],
            explanation: 'Supported',
          },
        ],
        summary: {
          total: 1,
          satisfied: 1,
          uncertain: 0,
          missing: 0,
          conflicting: 0,
          unsupported: 0,
        },
      };

      // 2. Perform tailoring
      const mockAIService: AIServiceLike = {
        generateStructured: vi.fn().mockResolvedValue({
          work: [
            {
              name: 'Acme Corp',
              position: 'Senior Backend Engineer',
              summary: 'Engineered high-scale systems',
              derivedFromFactIds: [confirmedFact.id],
            },
          ],
          projects: [],
          skills: [],
          education: [],
          awards: [],
        }),
      };

      const result = await tailorResumeWithCareerKnowledge(
        mockAIService,
        {
          profileId: profile.id,
          jdMatchReport: matchReport,
          baseResume: mockBaseResume,
          targetCompany: 'Stripe',
        },
        [confirmedFact]
      );

      // 3. Save as new draft
      const newDraftId = await careerKnowledgeAppService.saveTailoredResumeDraft(
        result,
        'Tailored Resume - Stripe.json',
        Number(sourceResumeId),
        { profileId: profile.id }
      );

      // 4. Verify source resume remains untouched
      const original = await db.resumes.get(sourceResumeId);
      expect(original?.fileName).toBe('Master Resume.pdf');
      expect(original?.isMain).toBe(true);

      // 5. Verify tailored draft is created with attribution and lineage
      const savedDraft = await db.resumes.get(newDraftId);
      expect(savedDraft).toBeDefined();
      expect(savedDraft?.fileName).toBe('Tailored Resume - Stripe.json');
      expect(
        (savedDraft?.parsedData?.work[0] as { derivedFromFactIds?: string[] })?.derivedFromFactIds
      ).toEqual([fact.id]);
      // Cross-device stable lineage: profile UUID is stamped on the draft meta
      expect(savedDraft?.parsedData?.meta?.tailoredFromProfileId).toBe(profile.id);
    });

    it('handles numeric preservation specifically: 2M -> 2M allowed, 2M -> 20M rejected', () => {
      const authorized = [mockFactGo, mockFactAcme];
      // 1. Allowed formatting (2M -> 2M or 2 million)
      const allowedResponse: ResumeTailoringAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Senior Backend Engineer',
            summary: 'Managed Go microservices',
            highlights: ['Processed 2M requests/day in production'],
            derivedFromFactIds: [mockFactAcme.id, mockFactGo.id],
          },
        ],
        projects: [],
        skills: [],
        education: [],
        awards: [],
      };
      const valid = validateTailoringAIResponse(allowedResponse, authorized, authorized, PROFILE_A);
      expect(valid.work.length).toBe(1);
      expect(valid.issues.length).toBe(0);

      // 2. Prohibited inflation (2M -> 20M)
      const inflated20M: ResumeTailoringAIResponse = {
        work: [
          {
            name: 'Acme Corp',
            position: 'Senior Backend Engineer',
            highlights: ['Scaled platform to 20M requests/day'],
            derivedFromFactIds: [mockFactAcme.id, mockFactGo.id],
          },
        ],
        projects: [],
        skills: [],
        education: [],
        awards: [],
      };
      const invalid20M = validateTailoringAIResponse(
        inflated20M,
        authorized,
        authorized,
        PROFILE_A
      );
      expect(invalid20M.work.length).toBe(0);
      expect(invalid20M.issues.some((i) => i.kind === 'metric_inflation')).toBe(true);
    });

    it('rejects conflicting facts from being arbitrarily resolved as authorized', () => {
      const requirements = [
        {
          id: 'req:conf',
          key: 'experience.acme',
          category: 'experience',
          description: 'Experience duration at Acme',
          importance: 'required' as const,
        },
      ];

      const fact1: CareerFact = {
        id: 'fact-conf-1',
        profileId: PROFILE_A,
        category: 'experience',
        subject: 'Acme',
        claim: '2 years at Acme',
        structured: { years: 2 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const fact2: CareerFact = {
        id: 'fact-conf-2',
        profileId: PROFILE_A,
        category: 'experience',
        subject: 'Acme',
        claim: '5 years at Acme',
        structured: { years: 5 },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const report = matchJDRequirements({
        profileId: PROFILE_A,
        requirements,
        facts: [fact1, fact2],
      });

      expect(report.summary.conflicting).toBe(1);
      // Conflicting requirement is not satisfied, so neither fact is in eligible set
      const eligibleIds = careerKnowledgeAppService.getEligibleFactIdsForJD(report);
      expect(eligibleIds).toEqual([]);
    });
  });
});
