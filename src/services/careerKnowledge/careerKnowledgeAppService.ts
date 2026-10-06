// Career Knowledge Application Service (Phase 9).
//
// Mediates between UI components and domain/repository/sync services.
// Adheres strictly to dependency direction: UI -> AppService -> Repository -> Domain.
// Never bypasses domain verification invariants.

import { careerKnowledgeRepository, CareerKnowledgeRepository } from './repository';
import {
  migrateResumeToCareerKnowledge,
  previewResumeMigration,
  type MigrationPreview,
  type MigrationResult,
} from './migration';
import {
  ExternalEvidenceService,
  GitHubEvidenceProvider,
  type ExternalEvidenceAcquisitionResult,
} from './externalEvidence';
import {
  detectKnowledgeGaps,
  planQuestions,
  generateQuestionWording,
  normalizeUserAnswer,
  persistNormalizedAnswer,
} from './questionEngine';
import {
  projectCareerKnowledgeToResume,
  type ProjectionConfig,
  type ProjectionResult,
} from './projection';
import {
  extractJDRequirementsFromParsedData,
  extractJDRequirementsWithAI,
  matchJDRequirements,
  convertMatchResultsToGaps,
  getEligibleConfirmedFactIds,
} from './jdMatching';
import { parseRawJobDescription } from '@/services/jobs/jdParser';
import {
  careerKnowledgeSyncService,
  CareerKnowledgeSyncService,
  type SyncProfileResult,
  type SyncHealthResult,
  type RemoteProfileSummary,
  type SyncStatus,
} from './syncService';
import { tailorResumeWithCareerKnowledge, createTailoredResumeDraftRow } from './resumeTailoring';
import { getService, getStoredAIConfig } from '@/services/ai';
import { db } from '@/lib/db';
import type {
  Actor,
  CareerEvidence,
  CareerFact,
  CareerFactCategory,
  CareerNote,
  CareerProfile,
  JDMatchReport,
  JDRequirement,
  KnowledgeGap,
  KnowledgeRequirement,
  QuestionPlan,
  QuestionGenerationResult,
  AnswerNormalizationResult,
  VerificationState,
  TailorResumeWithCareerKnowledgeRequest,
  TailorResumeWithCareerKnowledgeResult,
} from '@/types/careerKnowledge';
import type { Resume, ResumeData } from '@/types/resume';

const ACTIVE_PROFILE_STORAGE_KEY = 'active_career_profile_id';

export interface FactDetailResult {
  fact: CareerFact;
  evidence: CareerEvidence[];
  notes: CareerNote[];
  supersededByFact?: CareerFact;
}

export interface FactFilterOptions {
  category?: CareerFactCategory | 'all';
  verificationState?: VerificationState | 'all';
  search?: string;
}

export class CareerKnowledgeAppService {
  private readonly externalEvidenceService: ExternalEvidenceService;

  constructor(
    private readonly repository: CareerKnowledgeRepository = careerKnowledgeRepository,
    private readonly syncService: CareerKnowledgeSyncService = careerKnowledgeSyncService
  ) {
    this.externalEvidenceService = new ExternalEvidenceService(this.repository, [
      new GitHubEvidenceProvider(),
    ]);
  }

  // --- Profile Lifecycle -----------------------------------------------------

  async getActiveProfileId(): Promise<string> {
    const stored = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    if (stored) {
      const existing = await this.repository.getProfile(stored);
      if (existing) return existing.id;
    }

    // Default to the first available profile in the database or create one
    const defaultProfile = await this.ensureDefaultProfile();
    return defaultProfile.id;
  }

  setActiveProfileId(id: string): void {
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, id);
  }

  async listProfiles(): Promise<CareerProfile[]> {
    const list = await db.careerProfiles.toArray();
    if (list.length === 0) {
      const created = await this.createProfile();
      return [created];
    }
    return list;
  }

  async createProfile(): Promise<CareerProfile> {
    const profile = await this.repository.createProfile();
    this.setActiveProfileId(profile.id);
    return profile;
  }

  async ensureDefaultProfile(): Promise<CareerProfile> {
    const first = await db.careerProfiles.toCollection().first();
    if (first) {
      this.setActiveProfileId(first.id);
      return first;
    }
    return this.createProfile();
  }

  // --- Facts & Verification -------------------------------------------------

  async listFacts(profileId: string, filter?: FactFilterOptions): Promise<CareerFact[]> {
    let facts = await this.repository.listFacts(profileId);

    if (!filter) return facts;

    if (filter.category && filter.category !== 'all') {
      facts = facts.filter((f) => f.category === filter.category);
    }
    if (filter.verificationState && filter.verificationState !== 'all') {
      facts = facts.filter((f) => f.verificationState === filter.verificationState);
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      facts = facts.filter(
        (f) =>
          f.subject.toLowerCase().includes(q) ||
          f.claim.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    return facts;
  }

  async getFactDetail(factId: string): Promise<FactDetailResult | null> {
    const fact = await this.repository.getFact(factId);
    if (!fact) return null;

    const [evidence, notes] = await Promise.all([
      this.repository.listEvidenceForFact(factId),
      this.repository.listNotesForFact(factId),
    ]);

    let supersededByFact: CareerFact | undefined;
    if (fact.supersededBy) {
      supersededByFact = await this.repository.getFact(fact.supersededBy);
    }

    return {
      fact,
      evidence,
      notes,
      supersededByFact,
    };
  }

  /** Explicit user confirmation. Enforced by domain layer. */
  async confirmFact(factId: string, actor: Actor = 'user'): Promise<CareerFact> {
    return this.repository.confirmFact(factId, actor);
  }

  /** Explicit user rejection. Enforced by domain layer. */
  async rejectFact(factId: string, actor: Actor = 'user'): Promise<CareerFact> {
    return this.repository.rejectFact(factId, actor);
  }

  /** Move confirmed fact back to needs_confirmation. User only. */
  async invalidateFact(factId: string, actor: Actor = 'user'): Promise<CareerFact> {
    return this.repository.invalidateFact(factId, actor);
  }

  /** Presentation-neutral correction (typos/metadata). */
  async updateFactPresentation(
    factId: string,
    update: { subject?: string; claim?: string }
  ): Promise<CareerFact> {
    return this.repository.updateFactPresentation(factId, update);
  }

  async deleteFact(factId: string): Promise<void> {
    return this.repository.deleteFact(factId);
  }

  // --- Evidence --------------------------------------------------------------

  async listEvidence(profileId: string): Promise<CareerEvidence[]> {
    return this.repository.listEvidence(profileId);
  }

  async getEvidenceDetail(evidenceId: string): Promise<{
    evidence: CareerEvidence;
    linkedFacts: CareerFact[];
  } | null> {
    const evidence = await this.repository.getEvidence(evidenceId);
    if (!evidence) return null;

    const linkedFacts = await this.repository.listFactsForEvidence(evidenceId);
    return { evidence, linkedFacts };
  }

  async acquireGitHubEvidence(
    profileId: string,
    username: string,
    token?: string,
    createCandidates: boolean = false
  ): Promise<ExternalEvidenceAcquisitionResult> {
    return this.externalEvidenceService.acquireEvidence(
      'github',
      { profileId, subject: username, query: username },
      { token, createCandidates }
    );
  }

  // --- Resume Migration ------------------------------------------------------

  async listResumes(): Promise<Resume[]> {
    return db.resumes.toArray();
  }

  previewResumeMigration(resume: Resume, profileId: string): MigrationPreview {
    return previewResumeMigration(resume, profileId);
  }

  async migrateResume(resume: Resume, profileId: string): Promise<MigrationResult> {
    return migrateResumeToCareerKnowledge(resume, profileId);
  }

  // --- Question Engine & Gaps ------------------------------------------------

  async detectGaps(
    profileId: string,
    requirements: KnowledgeRequirement[]
  ): Promise<KnowledgeGap[]> {
    const facts = await this.repository.listFacts(profileId);
    return detectKnowledgeGaps(requirements, facts);
  }

  planQuestionsForGaps(gaps: KnowledgeGap[]): QuestionPlan[] {
    return planQuestions(gaps);
  }

  async generateQuestionWording(
    plan: QuestionPlan,
    requirement: KnowledgeRequirement
  ): Promise<QuestionGenerationResult> {
    const aiService = await getService(getStoredAIConfig());
    return generateQuestionWording(aiService, plan, requirement);
  }

  async submitUserAnswer(
    profileId: string,
    plan: QuestionPlan,
    answerText: string
  ): Promise<AnswerNormalizationResult> {
    const aiService = await getService(getStoredAIConfig());
    const normalizedFacts = await normalizeUserAnswer(aiService, plan, answerText);
    return persistNormalizedAnswer(this.repository, profileId, plan, normalizedFacts, answerText);
  }

  // --- JD Requirements & Deterministic Matching (Phase 10) -----------------

  async extractJDRequirements(
    rawJDText: string,
    options?: { useAI?: boolean; jdContext?: string }
  ): Promise<JDRequirement[]> {
    if (options?.useAI) {
      const aiService = await getService(getStoredAIConfig());
      return extractJDRequirementsWithAI(aiService, rawJDText, options.jdContext);
    }
    const parsed = parseRawJobDescription(rawJDText);
    return extractJDRequirementsFromParsedData(parsed, options?.jdContext);
  }

  async matchJDRequirements(
    profileId: string,
    requirements: JDRequirement[],
    jdId?: string
  ): Promise<JDMatchReport> {
    const [facts, evidence, links] = await Promise.all([
      this.repository.listFacts(profileId),
      this.repository.listEvidence(profileId),
      db.factEvidenceLinks.toArray(),
    ]);

    return matchJDRequirements({
      profileId,
      requirements,
      facts,
      evidence,
      links,
      jdId,
    });
  }

  async createQuestionPlansFromJDMatch(
    profileId: string,
    report: JDMatchReport
  ): Promise<{ gaps: KnowledgeGap[]; plans: QuestionPlan[] }> {
    const facts = await this.repository.listFacts(profileId);
    const gaps = convertMatchResultsToGaps(report, facts);
    const plans = planQuestions(gaps);
    return { gaps, plans };
  }

  getEligibleFactIdsForJD(report: JDMatchReport): string[] {
    return getEligibleConfirmedFactIds(report);
  }

  // --- AI-Assisted Resume Tailoring (Phase 11) ------------------------------

  async tailorResumeForJD(
    request: TailorResumeWithCareerKnowledgeRequest
  ): Promise<TailorResumeWithCareerKnowledgeResult> {
    const facts = await this.repository.listFacts(request.profileId);
    let aiService = null;
    try {
      aiService = await getService(getStoredAIConfig());
    } catch {
      // AI service not available or misconfigured - will fallback cleanly
    }
    return tailorResumeWithCareerKnowledge(aiService, request, facts);
  }

  async saveTailoredResumeDraft(
    result: TailorResumeWithCareerKnowledgeResult,
    title: string = 'Tailored Resume Draft',
    sourceResumeId?: number,
    jobMeta?: { jobId?: string; jobTitle?: string; company?: string; profileId?: string }
  ): Promise<number> {
    const tailoredResumeData: ResumeData = {
      ...result.tailoredResumeData,
      meta: {
        ...(result.tailoredResumeData.meta || {}),
        ...(sourceResumeId ? { tailoredFromResumeId: sourceResumeId } : {}),
        ...(jobMeta?.jobId ? { tailoredForJobId: jobMeta.jobId } : {}),
        ...(jobMeta?.jobTitle ? { tailoredForJobTitle: jobMeta.jobTitle } : {}),
        ...(jobMeta?.company ? { tailoredForJobCompany: jobMeta.company } : {}),
        // Backfill for fallback-projection results, which bypass
        // buildTailoredResumeData. Cross-device stable (client UUID),
        // unlike the local numeric tailoredFromResumeId.
        ...(jobMeta?.profileId && !result.tailoredResumeData.meta?.tailoredFromProfileId
          ? { tailoredFromProfileId: jobMeta.profileId }
          : {}),
      },
    };

    const row = createTailoredResumeDraftRow(tailoredResumeData, title);
    const newId = await db.resumes.add({
      ...row,
    });
    return Number(newId);
  }

  // --- Projection ------------------------------------------------------------

  async projectToResume(
    profileId: string,
    baseResume?: ResumeData,
    includeCategories?: CareerFactCategory[]
  ): Promise<ProjectionResult> {
    const facts = await this.repository.listFacts(profileId);
    const config: ProjectionConfig = {
      profileId,
      baseResume,
      includeCategories,
    };
    return projectCareerKnowledgeToResume(facts, config);
  }

  // --- Cloud Sync ------------------------------------------------------------

  getSyncStatus(): SyncStatus {
    return this.syncService.getStatus();
  }

  getLastSyncResult(): SyncProfileResult | null {
    return this.syncService.getLastResult();
  }

  async syncProfile(
    profileId: string,
    syncId: string,
    password: string
  ): Promise<SyncProfileResult> {
    return this.syncService.syncProfile(syncId, password, profileId);
  }

  async pushProfile(
    profileId: string,
    syncId: string,
    password: string
  ): Promise<SyncProfileResult> {
    return this.syncService.pushProfile(syncId, password, profileId);
  }

  async pullProfile(
    profileId: string,
    syncId: string,
    password: string
  ): Promise<SyncProfileResult> {
    return this.syncService.pullProfile(syncId, password, profileId);
  }

  async checkSyncHealth(): Promise<SyncHealthResult> {
    return this.syncService.checkHealth();
  }

  async listRemoteProfiles(
    syncId: string,
    password: string
  ): Promise<{
    success: boolean;
    profiles?: RemoteProfileSummary[];
    error?: string;
    status: SyncStatus;
  }> {
    return this.syncService.listRemoteProfiles(syncId, password);
  }
}

export const careerKnowledgeAppService = new CareerKnowledgeAppService();
