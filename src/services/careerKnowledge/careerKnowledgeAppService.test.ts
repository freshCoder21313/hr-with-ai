import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { withResumeDefaults } from '@/lib/resumeDefaults';
import { CareerKnowledgeAppService } from './careerKnowledgeAppService';
import { CareerKnowledgeRepository } from './repository';
import { CareerKnowledgeSyncService } from './syncService';
import type { Resume } from '@/types/resume';
import type { KnowledgeRequirement } from '@/types/careerKnowledge';

describe('CareerKnowledgeAppService', () => {
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

  describe('Profile lifecycle', () => {
    it('creates and sets active profile', async () => {
      const p1 = await appService.createProfile();
      expect(p1.id).toBeDefined();

      const activeId = await appService.getActiveProfileId();
      expect(activeId).toBe(p1.id);

      const p2 = await appService.createProfile();
      appService.setActiveProfileId(p2.id);
      expect(await appService.getActiveProfileId()).toBe(p2.id);

      const list = await appService.listProfiles();
      expect(list.length).toBe(2);
    });

    it('ensures default profile if none exists', async () => {
      const prof = await appService.ensureDefaultProfile();
      expect(prof.id).toBeDefined();
      const list = await appService.listProfiles();
      expect(list.length).toBe(1);
    });
  });

  describe('Facts & Verification Workflow', () => {
    it('lists and filters facts by category, state, and search query', async () => {
      const prof = await appService.createProfile();

      await repository.createFact({
        profileId: prof.id,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'Proficient in TypeScript development',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      const f2 = await repository.createFact({
        profileId: prof.id,
        category: 'experience',
        subject: 'Acme Corp',
        claim: 'Staff Software Engineer at Acme Corp',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      // Confirm f2
      await appService.confirmFact(f2.id);

      // All facts
      const all = await appService.listFacts(prof.id);
      expect(all.length).toBe(2);

      // Category filter
      const skills = await appService.listFacts(prof.id, { category: 'skill' });
      expect(skills.length).toBe(1);
      expect(skills[0].subject).toBe('TypeScript');

      // State filter
      const confirmed = await appService.listFacts(prof.id, { verificationState: 'confirmed' });
      expect(confirmed.length).toBe(1);
      expect(confirmed[0].subject).toBe('Acme Corp');

      // Search query
      const searchRes = await appService.listFacts(prof.id, { search: 'engineer' });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0].subject).toBe('Acme Corp');
    });

    it('confirms and rejects candidates with explicit human user actor', async () => {
      const prof = await appService.createProfile();

      const f1 = await repository.createFact({
        profileId: prof.id,
        category: 'skill',
        subject: 'React',
        claim: 'Frontend React expert',
        origin: 'migration',
        verificationState: 'needs_confirmation',
      });

      const confirmed = await appService.confirmFact(f1.id);
      expect(confirmed.verificationState).toBe('confirmed');

      const detail = await appService.getFactDetail(f1.id);
      expect(detail?.fact.verificationState).toBe('confirmed');

      // Invalidate back to needs_confirmation
      const invalidated = await appService.invalidateFact(f1.id);
      expect(invalidated.verificationState).toBe('needs_confirmation');

      // Reject
      const rejected = await appService.rejectFact(f1.id);
      expect(rejected.verificationState).toBe('rejected');
    });

    it('updates fact presentation without changing verification state', async () => {
      const prof = await appService.createProfile();
      const f = await repository.createFact({
        profileId: prof.id,
        category: 'skill',
        subject: 'Docker',
        claim: 'Container orchestration with Docker',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      const updated = await appService.updateFactPresentation(f.id, {
        subject: 'Docker & Podman',
      });

      expect(updated.subject).toBe('Docker & Podman');
      expect(updated.verificationState).toBe('needs_confirmation');
    });
  });

  describe('Evidence & Provenance', () => {
    it('retrieves evidence list and detail with linked facts', async () => {
      const prof = await appService.createProfile();

      const ev = await repository.createEvidence({
        profileId: prof.id,
        sourceType: 'github',
        sourceRef: 'repo:12345',
        excerpt: 'Created microservice in Go',
        url: 'https://github.com/example/repo',
      });

      const fact = await repository.createFact({
        profileId: prof.id,
        category: 'project',
        subject: 'Go Microservice',
        claim: 'Built high-throughput payment service',
        origin: 'external',
        verificationState: 'observed',
      });

      await repository.linkEvidenceToFact(fact.id, ev.id, 'supports');

      const evList = await appService.listEvidence(prof.id);
      expect(evList.length).toBe(1);

      const evDetail = await appService.getEvidenceDetail(ev.id);
      expect(evDetail?.evidence.sourceRef).toBe('repo:12345');
      expect(evDetail?.linkedFacts.length).toBe(1);
      expect(evDetail?.linkedFacts[0].id).toBe(fact.id);

      const factDetail = await appService.getFactDetail(fact.id);
      expect(factDetail?.evidence.length).toBe(1);
      expect(factDetail?.evidence[0].id).toBe(ev.id);
    });
  });

  describe('Resume Migration', () => {
    it('previews and executes resume migration into candidate facts', async () => {
      const prof = await appService.createProfile();

      const resume: Resume = {
        id: 1,
        fileName: 'resume.json',
        rawText: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parsedData: withResumeDefaults({
          basics: {
            name: 'Alice Developer',
            email: '',
            label: '',
            phone: '',
            url: '',
            summary: '',
            location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
            profiles: [],
          },
          skills: [{ name: 'Kubernetes' }, { name: 'Go' }],
          work: [
            { name: 'TechCo', position: 'Senior Engineer', startDate: '2020', endDate: '2023' },
          ],
          education: [],
          projects: [],
          awards: [],
        }),
      };

      const preview = appService.previewResumeMigration(resume, prof.id);
      expect(preview.facts.length).toBe(3);

      const result = await appService.migrateResume(resume, prof.id);
      expect(result.createdFacts.length).toBe(3);
      expect(result.createdEvidence.length).toBe(3);

      const facts = await appService.listFacts(prof.id);
      expect(facts.length).toBe(3);
      expect(facts.every((f) => f.verificationState === 'needs_confirmation')).toBe(true);
    });
  });

  describe('Question Engine & Gaps', () => {
    it('detects knowledge gaps for missing requirements', async () => {
      const prof = await appService.createProfile();

      const requirements: KnowledgeRequirement[] = [
        {
          key: 'aws_cloud',
          category: 'skill',
          description: 'Experience deploying to AWS',
        },
      ];

      const gaps = await appService.detectGaps(prof.id, requirements);
      expect(gaps.length).toBe(1);
      expect(gaps[0].type).toBe('missing');

      const plans = appService.planQuestionsForGaps(gaps);
      expect(plans.length).toBe(1);
      expect(plans[0].questionType).toBe('provide_new_fact');
    });
  });

  describe('Resume Projection', () => {
    it('projects confirmed facts into an attributed resume', async () => {
      const prof = await appService.createProfile();

      const skillFact = await repository.createFact({
        profileId: prof.id,
        category: 'skill',
        subject: 'TypeScript',
        claim: 'Expert in TypeScript',
        origin: 'user',
        verificationState: 'needs_confirmation',
      });

      // Confirm skill
      await appService.confirmFact(skillFact.id);

      const projection = await appService.projectToResume(prof.id);
      expect(projection.resumeData.skills?.length).toBe(1);
      expect(projection.resumeData.skills?.[0].name).toBe('TypeScript');
      expect(
        (projection.resumeData.skills?.[0] as { derivedFromFactIds?: string[] }).derivedFromFactIds
      ).toContain(skillFact.id);
    });
  });

  describe('JD Requirements & Matching (Phase 10)', () => {
    it('extracts requirements from raw JD and performs deterministic matching against profile', async () => {
      const prof = await appService.createProfile();

      // Create confirmed fact for Python and unconfirmed fact for Docker
      const f1 = await repository.createFact({
        profileId: prof.id,
        category: 'skill',
        subject: 'Python',
        claim: 'Senior Python backend engineer',
        verificationState: 'needs_confirmation',
        origin: 'user',
      });
      await appService.confirmFact(f1.id);

      await repository.createFact({
        profileId: prof.id,
        category: 'skill',
        subject: 'Docker',
        claim: 'Docker containerization',
        verificationState: 'needs_confirmation',
        origin: 'user',
      });

      const rawJD = `
Job Title: Python Backend Developer
Company: StarTech

Requirements:
• Strong experience with Python
• Familiarity with Docker
• Experience with Kubernetes
`;

      const requirements = await appService.extractJDRequirements(rawJD, {
        useAI: false,
        jdContext: 'startech-python',
      });
      expect(requirements.length).toBeGreaterThan(0);

      const report = await appService.matchJDRequirements(prof.id, requirements, 'startech-python');

      expect(report.profileId).toBe(prof.id);
      expect(report.jdId).toBe('startech-python');
      expect(report.summary.satisfied).toBeGreaterThanOrEqual(1); // Python
      expect(report.summary.uncertain).toBeGreaterThanOrEqual(1); // Docker
      expect(report.summary.missing).toBeGreaterThanOrEqual(1); // Kubernetes

      // Check Question Engine bridge
      const { gaps, plans } = await appService.createQuestionPlansFromJDMatch(prof.id, report);
      expect(gaps.length).toBeGreaterThan(0);
      expect(plans.length).toBeGreaterThan(0);

      // Check Resume Projection bridge (eligible confirmed facts)
      const eligibleFactIds = appService.getEligibleFactIdsForJD(report);
      expect(eligibleFactIds).toContain(f1.id);
    });
  });
});
