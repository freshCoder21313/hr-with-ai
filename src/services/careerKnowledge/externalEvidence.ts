// Career Knowledge External Evidence Acquisition & Provenance (Phase 5).
//
// Establishes an application-layer service and provider abstraction for acquiring
// traceable external evidence and generating unconfirmed candidate facts.
//
// Dependency direction: Service -> Repository -> Domain logic / Types.

import type {
  EvidenceQuery,
  EvidenceObservation,
  CareerEvidence,
  CareerFact,
  FactEvidenceLink,
  EvidenceSourceType,
} from '@/types/careerKnowledge';
import type { CareerKnowledgeRepository } from '@/services/careerKnowledge/repository';
import { fetchGitHubRepos } from '@/lib/github';
import { logger } from '@/lib/logger';

export type EvidenceFetchStatus =
  | 'success'
  | 'no_results'
  | 'unavailable'
  | 'auth_error'
  | 'rate_limited'
  | 'malformed_response';

export interface ProviderObservationResult {
  status: EvidenceFetchStatus;
  observations: EvidenceObservation[];
  error?: string;
}

/**
 * Abstraction for an external career evidence provider (e.g. GitHub, Web Search).
 */
export interface ExternalEvidenceProvider {
  readonly sourceType: EvidenceSourceType;
  fetchObservations(
    query: EvidenceQuery,
    options?: Record<string, unknown>
  ): Promise<ProviderObservationResult>;
}

export interface GitHubObservationMetadata {
  name: string;
  full_name: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  fork: boolean;
  topics?: string[];
}

/**
 * Real GitHub Evidence Provider wrapping fetchGitHubRepos.
 */
export class GitHubEvidenceProvider implements ExternalEvidenceProvider {
  readonly sourceType = 'github' as const;

  async fetchObservations(
    query: EvidenceQuery,
    options?: { token?: string }
  ): Promise<ProviderObservationResult> {
    try {
      const username = query.query.trim();
      if (!username) {
        return { status: 'no_results', observations: [] };
      }

      const repos = await fetchGitHubRepos(username, options?.token);
      if (repos.length === 0) {
        return { status: 'no_results', observations: [] };
      }

      const observations: EvidenceObservation[] = repos.map((repo) => ({
        sourceType: 'github',
        sourceRef: String(repo.id),
        title: repo.full_name,
        excerpt: repo.description || undefined,
        url: repo.html_url,
        capturedAt: new Date().toISOString(),
        metadata: {
          name: repo.name,
          full_name: repo.full_name,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          updated_at: repo.updated_at,
          fork: repo.fork,
          topics: repo.topics,
        },
      }));

      return { status: 'success', observations };
    } catch (err: unknown) {
      logger.error('GitHubEvidenceProvider error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User not found') || msg.includes('404')) {
        return { status: 'no_results', observations: [] };
      }
      if (msg.includes('Invalid token') || msg.includes('401')) {
        return { status: 'auth_error', observations: [], error: msg };
      }
      if (msg.includes('Rate limit exceeded') || msg.includes('403')) {
        return { status: 'rate_limited', observations: [], error: msg };
      }
      return { status: 'unavailable', observations: [], error: msg };
    }
  }
}

export interface ExternalEvidenceAcquisitionResult {
  status: EvidenceFetchStatus;
  evidence: CareerEvidence[];
  candidateFacts: CareerFact[];
  links: FactEvidenceLink[];
  error?: string;
}

/**
 * Service orchestrating external evidence providers, persistence, deduplication,
 * and deterministic candidate fact generation.
 */
export class ExternalEvidenceService {
  private readonly providers: Record<string, ExternalEvidenceProvider> = {};

  constructor(
    private readonly repository: CareerKnowledgeRepository,
    providersList: ExternalEvidenceProvider[] = []
  ) {
    for (const p of providersList) {
      this.providers[p.sourceType] = p;
    }
  }

  /**
   * Acquire external evidence, deduplicate idempotently, find matching existing facts deterministically,
   * link them, and optionally produce unconfirmed candidate facts for un-linked evidence.
   */
  async acquireEvidence(
    sourceType: EvidenceSourceType,
    query: EvidenceQuery,
    options?: { token?: string; createCandidates?: boolean }
  ): Promise<ExternalEvidenceAcquisitionResult> {
    const provider = this.providers[sourceType];
    if (!provider) {
      return {
        status: 'unavailable',
        evidence: [],
        candidateFacts: [],
        links: [],
        error: `Provider for sourceType "${sourceType}" is not registered.`,
      };
    }

    const providerResult = await provider.fetchObservations(query, options);
    if (providerResult.status !== 'success') {
      return {
        status: providerResult.status,
        evidence: [],
        candidateFacts: [],
        links: [],
        error: providerResult.error,
      };
    }

    const savedEvidence: CareerEvidence[] = [];
    const savedCandidateFacts: CareerFact[] = [];
    const savedLinks: FactEvidenceLink[] = [];

    // Process all observations inside a single db transaction to ensure integrity
    await this.repository.transaction('rw', async () => {
      // Fetch all existing evidence and facts for this profile to ensure idempotency and deterministic matching
      const existingEvidence = await this.repository.listEvidence(query.profileId);
      const existingFacts = await this.repository.listFacts(query.profileId);

      for (const obs of providerResult.observations) {
        // 1. Check idempotency (same sourceType + same sourceRef + same profileId)
        let evidenceRecord = existingEvidence.find(
          (e) => e.sourceType === obs.sourceType && e.sourceRef === obs.sourceRef
        );

        if (!evidenceRecord) {
          // Create new CareerEvidence record
          evidenceRecord = await this.repository.createEvidence({
            profileId: query.profileId,
            sourceType: obs.sourceType,
            sourceRef: obs.sourceRef,
            excerpt: obs.excerpt,
            url: obs.url,
          });
          savedEvidence.push(evidenceRecord);
        }

        // 2. Deterministic matching to existing CareerFacts
        let matchedFact: CareerFact | undefined;

        if (obs.sourceType === 'github' && obs.metadata) {
          const meta = obs.metadata as GitHubObservationMetadata;
          matchedFact = existingFacts.find((f) => {
            // Exact subject match or exact structured repository identifier match
            const subjectMatches = f.subject.toLowerCase() === meta.name.toLowerCase();
            const structRepoMatches = f.structured?.repository === meta.full_name;
            return subjectMatches || structRepoMatches;
          });
        }

        if (matchedFact) {
          // Check if link already exists
          const existingLinks = await this.repository.listLinksForFact(matchedFact.id);
          const linkExists = existingLinks.some((l) => l.evidenceId === evidenceRecord!.id);
          if (!linkExists) {
            const link = await this.repository.linkEvidenceToFact(
              matchedFact.id,
              evidenceRecord.id,
              'supports'
            );
            savedLinks.push(link);
          }
        } else if (options?.createCandidates) {
          // 3. Create unconfirmed candidate fact if requested and strong source semantics apply
          let candidate: CareerFact | undefined;

          if (obs.sourceType === 'github' && obs.metadata) {
            const meta = obs.metadata as GitHubObservationMetadata;
            // Generate observed project fact
            candidate = await this.repository.createFact({
              profileId: query.profileId,
              category: 'project',
              subject: meta.name,
              claim: `Contributed to or maintains repository ${meta.full_name} (${meta.language || 'Codebase'})`,
              structured: {
                repository: meta.full_name,
                language: meta.language,
                url: obs.url,
                stars: meta.stargazers_count,
              },
              origin: 'external',
              verificationState: 'observed', // Remains completely unconfirmed
            });
            savedCandidateFacts.push(candidate);

            // Link candidate fact to the supporting evidence
            const link = await this.repository.linkEvidenceToFact(
              candidate.id,
              evidenceRecord.id,
              'supports'
            );
            savedLinks.push(link);
          }
        }
      }
    });

    return {
      status: 'success',
      evidence: savedEvidence,
      candidateFacts: savedCandidateFacts,
      links: savedLinks,
    };
  }
}
