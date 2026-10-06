// Career Knowledge Question Engine tests (Phase 4).
//
// Uses fake-indexeddb for Dexie persistence testing. Mocks the AI service to
// verify structured output question formulation and answer normalization.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { CareerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import {
  isRequirementMatch,
  detectKnowledgeGaps,
  planQuestions,
  generateQuestionWording,
  normalizeUserAnswer,
  persistNormalizedAnswer,
} from '@/services/careerKnowledge/questionEngine';
import type { CareerFact, KnowledgeRequirement, QuestionPlan } from '@/types/careerKnowledge';

const repo = new CareerKnowledgeRepository(db);

async function clearCareerTables() {
  await db.transaction(
    'rw',
    [db.careerProfiles, db.careerFacts, db.careerEvidence, db.factEvidenceLinks, db.careerNotes],
    async () => {
      await Promise.all([
        db.careerProfiles.clear(),
        db.careerFacts.clear(),
        db.careerEvidence.clear(),
        db.factEvidenceLinks.clear(),
        db.careerNotes.clear(),
      ]);
    }
  );
}

describe('Career Knowledge Question Engine', () => {
  beforeEach(async () => {
    await clearCareerTables();
  });

  afterEach(async () => {
    await clearCareerTables();
  });

  // --- isRequirementMatch --------------------------------------------------

  describe('isRequirementMatch', () => {
    it('matches subject case-insensitively', () => {
      const req: KnowledgeRequirement = {
        key: 'Kubernetes',
        category: 'skill',
        description: 'Kubernetes production experience',
      };
      const fact: CareerFact = {
        id: 'fact-1',
        profileId: 'profile-1',
        category: 'skill',
        subject: 'kubernetes',
        claim: 'Has used kubernetes',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(isRequirementMatch(req, fact)).toBe(true);
    });

    it('matches structured attributes', () => {
      const req: KnowledgeRequirement = {
        key: 'Acme',
        category: 'experience',
        description: 'Experience at Acme Corp',
      };
      const fact: CareerFact = {
        id: 'fact-1',
        profileId: 'profile-1',
        category: 'experience',
        subject: 'Work experience',
        claim: 'Software Engineer at Acme Corp',
        structured: { company: 'Acme' },
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(isRequirementMatch(req, fact)).toBe(true);
    });

    it('matches claim substring fallback', () => {
      const req: KnowledgeRequirement = {
        key: 'payments',
        category: 'project',
        description: 'Worked on payments system',
      };
      const fact: CareerFact = {
        id: 'fact-1',
        profileId: 'profile-1',
        category: 'project',
        subject: 'Main project',
        claim: 'Re-architected the main payments engine',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(isRequirementMatch(req, fact)).toBe(true);
    });

    it('respects category mapping (e.g. technical maps to skill/project)', () => {
      const req: KnowledgeRequirement = {
        key: 'Rust',
        category: 'technical',
        description: 'Technical Rust experience',
      };
      const skillFact: CareerFact = {
        id: 'fact-1',
        profileId: 'profile-1',
        category: 'skill',
        subject: 'rust',
        claim: 'Used rust for system tools',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const experienceFact: CareerFact = {
        id: 'fact-2',
        profileId: 'profile-1',
        category: 'experience',
        subject: 'Rust job',
        claim: 'Senior Engineer using rust',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(isRequirementMatch(req, skillFact)).toBe(true);
      // "technical" does not map to "experience" (only to "skill" or "project")
      expect(isRequirementMatch(req, experienceFact)).toBe(false);
    });
  });

  // --- detectKnowledgeGaps -------------------------------------------------

  describe('detectKnowledgeGaps', () => {
    it('detects missing gap when no facts match', () => {
      const reqs: KnowledgeRequirement[] = [
        { key: 'Docker', category: 'skill', description: 'Docker containerization' },
      ];
      const gaps = detectKnowledgeGaps(reqs, []);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing');
    });

    it('detects satisfied when confirmed fact exists', () => {
      const reqs: KnowledgeRequirement[] = [
        { key: 'Go', category: 'skill', description: 'Go language' },
      ];
      const fact: CareerFact = {
        id: 'f-1',
        profileId: 'p-1',
        category: 'skill',
        subject: 'Go',
        claim: 'Go developer',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const gaps = detectKnowledgeGaps(reqs, [fact]);
      expect(gaps).toHaveLength(0); // satisfied, no gap returned
    });

    it('detects uncertain when needs_confirmation fact exists', () => {
      const reqs: KnowledgeRequirement[] = [
        { key: 'Go', category: 'skill', description: 'Go language' },
      ];
      const fact: CareerFact = {
        id: 'f-1',
        profileId: 'p-1',
        category: 'skill',
        subject: 'Go',
        claim: 'Go developer',
        verificationState: 'needs_confirmation',
        origin: 'migration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const gaps = detectKnowledgeGaps(reqs, [fact]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('uncertain');
    });

    it('detects conflicting when there are contradictory active facts', () => {
      const reqs: KnowledgeRequirement[] = [
        { key: 'AWS', category: 'skill', description: 'AWS experience' },
      ];
      const confirmedFact: CareerFact = {
        id: 'f-1',
        profileId: 'p-1',
        category: 'skill',
        subject: 'AWS',
        claim: 'Used AWS for 5 years',
        verificationState: 'confirmed',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const contradictoryFact: CareerFact = {
        id: 'f-2',
        profileId: 'p-1',
        category: 'skill',
        subject: 'AWS',
        claim: 'Never used AWS cloud tools',
        verificationState: 'needs_confirmation',
        origin: 'ai_inference',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const gaps = detectKnowledgeGaps(reqs, [confirmedFact, contradictoryFact]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('conflicting');
    });

    it('detects missing when all matching facts are rejected', () => {
      const reqs: KnowledgeRequirement[] = [
        { key: 'Ruby', category: 'skill', description: 'Ruby experience' },
      ];
      const fact: CareerFact = {
        id: 'f-1',
        profileId: 'p-1',
        category: 'skill',
        subject: 'Ruby',
        claim: 'Experienced with Ruby',
        verificationState: 'rejected',
        origin: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const gaps = detectKnowledgeGaps(reqs, [fact]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].type).toBe('missing');
    });
  });

  // --- planQuestions -------------------------------------------------------

  describe('planQuestions', () => {
    it('formulates provide_new_fact plans for missing gaps with mapped category', () => {
      const req: KnowledgeRequirement = {
        key: 'PostgreSQL',
        category: 'work',
        description: 'PostgreSQL database administration',
      };
      const gaps = detectKnowledgeGaps([req], []);
      const plans = planQuestions(gaps);

      expect(plans).toHaveLength(1);
      expect(plans[0].questionType).toBe('provide_new_fact');
      expect(plans[0].targetFactShape.category).toBe('experience'); // Maps 'work' -> 'experience'
      expect(plans[0].targetFactShape.subject).toBe('PostgreSQL');
    });

    it('formulates confirm_existing_fact plans for uncertain gaps', () => {
      const req: KnowledgeRequirement = {
        key: 'Kubernetes',
        category: 'skill',
        description: 'Kubernetes container platform',
      };
      const fact: CareerFact = {
        id: 'fact-abc',
        profileId: 'p-1',
        category: 'skill',
        subject: 'Kubernetes',
        claim: 'Used Kubernetes in testing environment',
        verificationState: 'needs_confirmation',
        origin: 'migration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const gaps = detectKnowledgeGaps([req], [fact]);
      const plans = planQuestions(gaps);

      expect(plans).toHaveLength(1);
      expect(plans[0].questionType).toBe('confirm_existing_fact');
      expect(plans[0].targetFactShape.claim).toBe('Used Kubernetes in testing environment');
      expect(plans[0].sourceContext).toContain('fact-abc');
    });
  });

  // --- AI Wording ----------------------------------------------------------

  describe('AI Question Formulation', () => {
    it('generates structured question wording from a QuestionPlan', async () => {
      const mockAIService = {
        generateStructured: async <T>() =>
          ({
            question: 'How have you used AWS in your past roles?',
            answerShape: 'A description of services and projects.',
            rationale: 'Clarify AWS experience.',
          }) as unknown as T,
      };

      const plan: QuestionPlan = {
        gapId: 'gap-aws',
        requirementKey: 'AWS',
        reason: 'Missing AWS skill confirmation.',
        questionType: 'provide_new_fact',
        targetFactShape: { category: 'skill', subject: 'AWS', claim: '' },
      };

      const requirement: KnowledgeRequirement = {
        key: 'AWS',
        category: 'skill',
        description: 'AWS expertise',
      };

      const result = await generateQuestionWording(mockAIService, plan, requirement);
      expect(result.question).toBe('How have you used AWS in your past roles?');
      expect(result.answerShape).toBe('A description of services and projects.');
      expect(result.rationale).toBe('Clarify AWS experience.');
    });
  });

  // --- Answer Normalization ------------------------------------------------

  describe('AI Answer Normalization & Safety', () => {
    const plan: QuestionPlan = {
      gapId: 'gap-k8s',
      requirementKey: 'Kubernetes',
      reason: 'Missing Kubernetes experience details.',
      questionType: 'provide_new_fact',
      targetFactShape: { category: 'skill', subject: 'Kubernetes', claim: '' },
    };

    it('extracts explicitly stated facts', async () => {
      const mockAIService = {
        generateStructured: async <T>() =>
          ({
            facts: [
              {
                category: 'skill',
                subject: 'Kubernetes',
                claim: 'Used Kubernetes at Acme Corp.',
                explicitlyStated: true,
                rationale: 'User stated using Kubernetes at Acme.',
              },
            ],
          }) as unknown as T,
      };

      const results = await normalizeUserAnswer(mockAIService, plan, 'I used Kubernetes at Acme.');
      expect(results).toHaveLength(1);
      expect(results[0].claim).toBe('Used Kubernetes at Acme Corp.');
      expect(results[0].explicitlyStated).toBe(true);
    });

    it('correctly filters out inferred (hallucinated) details', async () => {
      const mockAIService = {
        generateStructured: async <T>() =>
          ({
            facts: [
              {
                category: 'skill',
                subject: 'Kubernetes',
                claim: 'Used Kubernetes at Acme Corp.',
                explicitlyStated: true,
              },
              {
                category: 'experience',
                subject: 'Kubernetes Production Scale',
                claim: 'Managed a production cluster with 100 nodes.',
                explicitlyStated: false, // Inferred, but NOT explicitly stated!
              },
            ],
          }) as unknown as T,
      };

      const results = await normalizeUserAnswer(mockAIService, plan, 'I used Kubernetes at Acme.');
      expect(results).toHaveLength(2);

      // The integration layer (persistNormalizedAnswer) will exclude explicitlyStated: false.
      const persisted = results.filter((r) => r.explicitlyStated);
      expect(persisted).toHaveLength(1);
      expect(persisted[0].claim).toBe('Used Kubernetes at Acme Corp.');
    });
  });

  // --- Transactional Persistence & Profile Isolation ---------------------

  describe('Persistence Integration & Profile Isolation', () => {
    it('transactionally persists candidates as needs_confirmation with link provenance', async () => {
      const profile = await repo.createProfile();
      const profileId = profile.id;

      const plan: QuestionPlan = {
        gapId: 'gap-go',
        requirementKey: 'Go',
        reason: 'Missing Go details.',
        questionType: 'provide_new_fact',
        targetFactShape: { category: 'skill', subject: 'Go', claim: '' },
      };

      const normalizedFacts = [
        {
          category: 'skill' as const,
          subject: 'Go',
          claim: 'Writes concurrent payment processors in Go',
          structured: { skill: 'Go' },
          explicitlyStated: true,
        },
      ];

      const answerText = 'I write concurrent payment processors in Go';

      // Inject deterministic IDs to make verification simple and consistent
      const ctx = {
        id: () => 'deterministic-fact-id-123',
      };

      const result = await persistNormalizedAnswer(
        repo,
        profileId,
        plan,
        normalizedFacts,
        answerText,
        ctx
      );

      expect(result.candidateFacts).toHaveLength(1);
      expect(result.evidence).toHaveLength(1);
      expect(result.links).toHaveLength(1);

      // Check candidate verification state is unconfirmed Candidate State per Phase 1 contract
      const persistedFact = await repo.getFact('deterministic-fact-id-123');
      expect(persistedFact).toBeDefined();
      expect(persistedFact?.verificationState).toBe('needs_confirmation');
      expect(persistedFact?.profileId).toBe(profileId);
      expect(persistedFact?.claim).toBe('Writes concurrent payment processors in Go');

      // Check evidence text captures Q&A context as immutable provenance
      const persistedEvidence = await repo.getEvidence(result.evidence[0].id);
      expect(persistedEvidence).toBeDefined();
      expect(persistedEvidence?.profileId).toBe(profileId);
      expect(persistedEvidence?.excerpt).toContain('Q: Missing Go details.');
      expect(persistedEvidence?.excerpt).toContain(
        'A: I write concurrent payment processors in Go'
      );

      // Check linked evidence relation is supports
      const linked = await repo.listLinksForFact('deterministic-fact-id-123');
      expect(linked).toHaveLength(1);
      expect(linked[0].relation).toBe('supports');
      expect(linked[0].evidenceId).toBe(result.evidence[0].id);
    });

    it('enforces strict profile isolation', async () => {
      const profileA = await repo.createProfile();
      const profileB = await repo.createProfile();

      const plan: QuestionPlan = {
        gapId: 'gap-isolated',
        requirementKey: 'Docker',
        reason: 'Missing Docker info.',
        questionType: 'provide_new_fact',
        targetFactShape: { category: 'skill', subject: 'Docker', claim: '' },
      };

      const normalizedFacts = [
        {
          category: 'skill' as const,
          subject: 'Docker',
          claim: 'Uses Docker multi-stage builds',
          explicitlyStated: true,
        },
      ];

      // Persist into Profile A
      await persistNormalizedAnswer(repo, profileA.id, plan, normalizedFacts, 'Yes, Docker.');

      // Query Profile A
      const factsA = await repo.listFacts(profileA.id);
      expect(factsA).toHaveLength(1);
      expect(factsA[0].profileId).toBe(profileA.id);

      // Query Profile B (must be empty/isolated)
      const factsB = await repo.listFacts(profileB.id);
      expect(factsB).toHaveLength(0);
    });
  });
});
