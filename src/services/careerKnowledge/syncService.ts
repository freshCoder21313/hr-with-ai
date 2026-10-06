// Career Knowledge PostgreSQL / Neon Cloud Sync Service (Phase 8 Hardened).
//
// Translates local validated Career Knowledge state (Dexie) into remote
// persistence operations, and merges remote state into local storage.
//
// Invariants:
//   * Never bypasses Phase 1 verification state invariants
//   * Existing confirmed facts are never silently downgraded
//   * Evidence provenance and immutability are strictly preserved
//   * Historical superseded facts survive synchronization
//   * Sync operations are fully idempotent
//   * Retries are bounded with exponential backoff and jitter
//   * Timeouts are classified as unknown outcomes rather than confirmed rejections
//   * Telemetry is non-intrusive and never logs secrets

import axios, { type AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CAREER_SCHEMA_VERSION } from './careerKnowledge';
import { careerEvidenceSchema, careerFactSchema, careerNoteSchema } from './schemas';
import { careerKnowledgeTelemetry } from './telemetry';
import type {
  CareerEvidence,
  CareerFact,
  CareerNote,
  CareerProfile,
  FactEvidenceLink,
} from '@/types/careerKnowledge';

export interface CareerKnowledgeSyncData {
  profile: CareerProfile;
  facts: CareerFact[];
  evidence: CareerEvidence[];
  links: FactEvidenceLink[];
  notes: CareerNote[];
}

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'success'
  | 'retryable_error'
  | 'non_retryable_error'
  | 'auth_failure'
  | 'authorization_failure'
  | 'conflict'
  | 'schema_mismatch'
  | 'unknown_outcome';

export type SyncFailureCategory =
  | 'auth_failure'
  | 'authorization_failure'
  | 'conflict'
  | 'schema_mismatch'
  | 'validation_error'
  | 'timeout'
  | 'server_error'
  | 'rate_limited'
  | 'network_error'
  | 'unknown';

export interface SyncProfileResult {
  success: boolean;
  status: SyncStatus;
  profileId?: string;
  syncedAt?: string;
  data?: CareerKnowledgeSyncData;
  error?: string;
  errorCategory?: SyncFailureCategory;
  /** Raw HTTP status from the sync endpoint (e.g. 404 = remote profile absent). */
  statusCode?: number;
  requestId?: string;
  retryCount?: number;
  durationMs?: number;
}

export interface RemoteProfileSummary {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncHealthResult {
  healthy: boolean;
  status?: string;
  database?: string;
  schemaVersion?: number;
  error?: string;
}

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 200,
  maxDelayMs: 2000,
};

function unwrapResponse<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    const outer = res as Record<string, unknown>;
    // If the outer object already looks like a response body (has success /
    // profiles / health markers), it is already unwrapped — return as-is.
    // This happens because apiClient's response interceptor returns
    // response.data directly.
    if ('success' in outer || 'profiles' in outer || 'status' in outer || 'database' in outer) {
      return res as T;
    }
    const inner = outer.data;
    if (inner && typeof inner === 'object') {
      const innerRec = inner as Record<string, unknown>;
      if (
        'success' in innerRec ||
        'profiles' in innerRec ||
        'status' in innerRec ||
        'database' in innerRec
      ) {
        return inner as T;
      }
    }
  }
  return res as T;
}

export class CareerKnowledgeSyncService {
  private currentStatus: SyncStatus = 'idle';
  private lastResult: SyncProfileResult | null = null;

  getStatus(): SyncStatus {
    return this.currentStatus;
  }

  getLastResult(): SyncProfileResult | null {
    return this.lastResult;
  }

  /**
   * Export complete local Career Knowledge dataset for a single profile.
   */
  async exportProfileData(profileId: string): Promise<CareerKnowledgeSyncData | null> {
    const profile = await db.careerProfiles.get(profileId);
    if (!profile) return null;

    const facts = await db.careerFacts.where('profileId').equals(profileId).toArray();
    const evidence = await db.careerEvidence.where('profileId').equals(profileId).toArray();

    const factIds = facts.map((f) => f.id);
    let links: FactEvidenceLink[] = [];
    let notes: CareerNote[] = [];

    if (factIds.length > 0) {
      links = await db.factEvidenceLinks.where('factId').anyOf(factIds).toArray();
      notes = await db.careerNotes.where('factId').anyOf(factIds).toArray();
    }

    return {
      profile,
      facts,
      evidence,
      links,
      notes,
    };
  }

  /**
   * Domain-safe import/merge of remote Career Knowledge data into local Dexie storage.
   */
  async importProfileData(profileId: string, cloudData: CareerKnowledgeSyncData): Promise<void> {
    if (!cloudData || !cloudData.profile) {
      throw new Error('importProfileData: invalid cloud data payload');
    }

    // Schema version compatibility check
    if (cloudData.profile.schemaVersion > CAREER_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported schema version ${cloudData.profile.schemaVersion} (max supported: ${CAREER_SCHEMA_VERSION})`
      );
    }

    await db.transaction(
      'rw',
      [db.careerProfiles, db.careerFacts, db.careerEvidence, db.factEvidenceLinks, db.careerNotes],
      async () => {
        // 1. Profile
        const localProfile = await db.careerProfiles.get(profileId);
        if (!localProfile) {
          await db.careerProfiles.add(cloudData.profile);
        } else {
          const localTime = new Date(localProfile.updatedAt).getTime() || 0;
          const cloudTime = new Date(cloudData.profile.updatedAt).getTime() || 0;
          if (cloudTime > localTime) {
            await db.careerProfiles.put(cloudData.profile);
          }
        }

        // 2. Evidence (immutable provenance)
        for (const remoteEv of cloudData.evidence || []) {
          const localEv = await db.careerEvidence.get(remoteEv.id);
          if (!localEv) {
            const parsed = careerEvidenceSchema.safeParse(remoteEv);
            if (!parsed.success) {
              logger.warn(`Skipping invalid career evidence during sync import.`);
              continue;
            }
            await db.careerEvidence.add(parsed.data as CareerEvidence);
          } else {
            // Immutability audit: check for content divergence
            if (
              localEv.sourceType !== remoteEv.sourceType ||
              localEv.sourceRef !== remoteEv.sourceRef ||
              localEv.excerpt !== remoteEv.excerpt ||
              localEv.url !== remoteEv.url
            ) {
              logger.warn(
                `Evidence "${remoteEv.id}" content mismatch during sync import; retaining local immutable record.`
              );
            }
          }
        }

        // 3. Facts
        for (const remoteFact of cloudData.facts || []) {
          const localFact = await db.careerFacts.get(remoteFact.id);
          if (!localFact) {
            const parsed = careerFactSchema.safeParse(remoteFact);
            if (!parsed.success) {
              logger.warn(`Skipping invalid career fact during sync import.`);
              continue;
            }
            await db.careerFacts.add(parsed.data as CareerFact);
          } else {
            let targetVerificationState = localFact.verificationState;

            // Invariant: If remote is confirmed and local is not, upgrade to confirmed
            if (
              remoteFact.verificationState === 'confirmed' &&
              localFact.verificationState !== 'confirmed'
            ) {
              targetVerificationState = 'confirmed';
            }
            // Invariant: If local is confirmed and remote is not, keep local confirmed
            else if (
              localFact.verificationState === 'confirmed' &&
              remoteFact.verificationState !== 'confirmed'
            ) {
              targetVerificationState = 'confirmed';
            } else if (
              remoteFact.verificationState === 'rejected' &&
              localFact.verificationState !== 'confirmed'
            ) {
              targetVerificationState = 'rejected';
            }

            const localTime = new Date(localFact.updatedAt).getTime() || 0;
            const remoteTime = new Date(remoteFact.updatedAt).getTime() || 0;

            const mergedFact: CareerFact = {
              ...localFact,
              ...(remoteTime >= localTime
                ? {
                    subject: remoteFact.subject,
                    claim: remoteFact.claim,
                    structured: remoteFact.structured ?? localFact.structured,
                    category: remoteFact.category,
                    updatedAt: remoteFact.updatedAt,
                  }
                : {}),
              verificationState: targetVerificationState,
              supersededBy: remoteFact.supersededBy ?? localFact.supersededBy,
            };

            await db.careerFacts.put(mergedFact);
          }
        }

        // 4. Links (idempotent)
        for (const remoteLink of cloudData.links || []) {
          const existing = await db.factEvidenceLinks.get([
            remoteLink.factId,
            remoteLink.evidenceId,
          ]);
          if (!existing) {
            await db.factEvidenceLinks.put(remoteLink);
          }
        }

        // 5. Notes
        for (const remoteNote of cloudData.notes || []) {
          const localNote = await db.careerNotes.get(remoteNote.id);
          if (!localNote) {
            const parsed = careerNoteSchema.safeParse(remoteNote);
            if (!parsed.success) {
              logger.warn(`Skipping invalid career note during sync import.`);
              continue;
            }
            await db.careerNotes.add(parsed.data as unknown as CareerNote);
          } else {
            const localTime = new Date(localNote.updatedAt).getTime() || 0;
            const remoteTime = new Date(remoteNote.updatedAt).getTime() || 0;
            if (remoteTime > localTime) {
              await db.careerNotes.put(remoteNote);
            }
          }
        }
      }
    );
  }

  /**
   * Push local Career Knowledge for a profile to remote PostgreSQL database.
   */
  async pushProfile(
    syncId: string,
    password: string,
    profileId: string,
    retryConfig?: RetryConfig
  ): Promise<SyncProfileResult> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.currentStatus = 'syncing';

    careerKnowledgeTelemetry.emit({
      type: 'sync_started',
      action: 'push_career_knowledge',
      requestId,
      profileId,
    });

    const localData = await this.exportProfileData(profileId);
    if (!localData) {
      const result: SyncProfileResult = {
        success: false,
        status: 'non_retryable_error',
        errorCategory: 'validation_error',
        error: `Local profile "${profileId}" not found.`,
        requestId,
        durationMs: Date.now() - startTime,
      };
      this.currentStatus = 'non_retryable_error';
      this.lastResult = result;
      careerKnowledgeTelemetry.emit({
        type: 'sync_failed',
        action: 'push_career_knowledge',
        requestId,
        profileId,
        errorClass: 'validation_error',
        durationMs: result.durationMs,
      });
      return result;
    }

    const { result, retries } = await this.executeWithRetry<{
      success: boolean;
      profileId: string;
      syncedAt: string;
    }>(
      async () => {
        return await apiClient.post(
          '/sync',
          {
            action: 'push_career_knowledge',
            password,
            profileId,
            data: localData,
          },
          {
            headers: {
              'x-sync-id': syncId,
              'x-request-id': requestId,
            },
          }
        );
      },
      'push_career_knowledge',
      requestId,
      profileId,
      retryConfig
    );

    const durationMs = Date.now() - startTime;

    if (!result.success) {
      const syncResult: SyncProfileResult = {
        success: false,
        status: result.status,
        error: result.error,
        errorCategory: result.errorCategory,
        requestId,
        retryCount: retries,
        durationMs,
      };
      this.currentStatus = result.status;
      this.lastResult = syncResult;
      return syncResult;
    }

    const unwrapped = unwrapResponse<{ success: boolean; profileId?: string; syncedAt?: string }>(
      result.data
    );

    const syncResult: SyncProfileResult = {
      success: true,
      status: 'success',
      profileId: unwrapped?.profileId || profileId,
      syncedAt: unwrapped?.syncedAt || new Date().toISOString(),
      requestId,
      retryCount: retries,
      durationMs,
    };

    this.currentStatus = 'success';
    this.lastResult = syncResult;

    careerKnowledgeTelemetry.emit({
      type: 'sync_succeeded',
      action: 'push_career_knowledge',
      requestId,
      profileId,
      retryCount: retries,
      durationMs,
    });

    return syncResult;
  }

  /**
   * Pull remote Career Knowledge for a profile from remote PostgreSQL database.
   */
  async pullProfile(
    syncId: string,
    password: string,
    profileId: string,
    retryConfig?: RetryConfig
  ): Promise<SyncProfileResult> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.currentStatus = 'syncing';

    careerKnowledgeTelemetry.emit({
      type: 'sync_started',
      action: 'pull_career_knowledge',
      requestId,
      profileId,
    });

    const { result, retries } = await this.executeWithRetry<{
      success: boolean;
      profileId: string;
      data: CareerKnowledgeSyncData;
    }>(
      async () => {
        return await apiClient.post(
          '/sync',
          {
            action: 'pull_career_knowledge',
            password,
            profileId,
          },
          {
            headers: {
              'x-sync-id': syncId,
              'x-request-id': requestId,
            },
          }
        );
      },
      'pull_career_knowledge',
      requestId,
      profileId,
      retryConfig
    );

    const durationMs = Date.now() - startTime;

    if (!result.success) {
      const syncResult: SyncProfileResult = {
        success: false,
        status: result.status,
        error: result.error,
        errorCategory: result.errorCategory,
        statusCode: result.statusCode,
        requestId,
        retryCount: retries,
        durationMs,
      };
      this.currentStatus = result.status;
      this.lastResult = syncResult;
      return syncResult;
    }

    const unwrapped = unwrapResponse<{
      success: boolean;
      profileId: string;
      data: CareerKnowledgeSyncData;
    }>(result.data);

    try {
      if (unwrapped?.data) {
        await this.importProfileData(profileId, unwrapped.data);
      }

      const syncResult: SyncProfileResult = {
        success: true,
        status: 'success',
        profileId: unwrapped?.profileId || profileId,
        data: unwrapped?.data,
        requestId,
        retryCount: retries,
        durationMs,
      };

      this.currentStatus = 'success';
      this.lastResult = syncResult;

      careerKnowledgeTelemetry.emit({
        type: 'sync_succeeded',
        action: 'pull_career_knowledge',
        requestId,
        profileId,
        retryCount: retries,
        durationMs,
      });

      return syncResult;
    } catch (err: unknown) {
      const isSchemaErr =
        err instanceof Error && err.message.includes('Unsupported schema version');
      const status: SyncStatus = isSchemaErr ? 'schema_mismatch' : 'non_retryable_error';
      const category: SyncFailureCategory = isSchemaErr ? 'schema_mismatch' : 'validation_error';

      const syncResult: SyncProfileResult = {
        success: false,
        status,
        errorCategory: category,
        error: err instanceof Error ? err.message : 'Failed to import remote data',
        requestId,
        retryCount: retries,
        durationMs,
      };

      this.currentStatus = status;
      this.lastResult = syncResult;

      careerKnowledgeTelemetry.emit({
        type: isSchemaErr ? 'sync_schema_mismatch' : 'sync_failed',
        action: 'pull_career_knowledge',
        requestId,
        profileId,
        errorClass: category,
        durationMs,
      });

      return syncResult;
    }
  }

  /**
   * Full bidirectional synchronization:
   *   1. Pull remote state and merge locally (preserving invariants).
   *   2. Push merged local state back to remote PostgreSQL.
   */
  async syncProfile(
    syncId: string,
    password: string,
    profileId: string,
    retryConfig?: RetryConfig
  ): Promise<SyncProfileResult> {
    const startTime = Date.now();
    try {
      // 1. Pull remote state (if remote profile exists)
      const pullRes = await this.pullProfile(syncId, password, profileId, retryConfig);
      // Absent remote profile is fine if this profile has never been synced
      // before — detected via the raw HTTP status, not message substrings
      // (a 400/500 whose text happens to contain "not found" must abort).
      const isProfileAbsent = pullRes.statusCode === 404;
      if (!pullRes.success && !isProfileAbsent) {
        return pullRes;
      }

      // 2. Push unified local state to remote
      return await this.pushProfile(syncId, password, profileId, retryConfig);
    } catch (error: unknown) {
      logger.error('syncProfile error:', error);
      const result: SyncProfileResult = {
        success: false,
        status: 'non_retryable_error',
        errorCategory: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown sync error',
        durationMs: Date.now() - startTime,
      };
      this.currentStatus = 'non_retryable_error';
      this.lastResult = result;
      return result;
    }
  }

  /**
   * List summary of remote career profiles owned by the authenticated syncId.
   */
  async listRemoteProfiles(
    syncId: string,
    password: string,
    retryConfig?: RetryConfig
  ): Promise<{
    success: boolean;
    profiles?: RemoteProfileSummary[];
    error?: string;
    status: SyncStatus;
  }> {
    const requestId = this.generateRequestId();
    const { result } = await this.executeWithRetry<{
      success: boolean;
      profiles: RemoteProfileSummary[];
    }>(
      async () => {
        return await apiClient.post(
          '/sync',
          {
            action: 'list_career_profiles',
            password,
          },
          {
            headers: {
              'x-sync-id': syncId,
              'x-request-id': requestId,
            },
          }
        );
      },
      'list_career_profiles',
      requestId,
      undefined,
      retryConfig
    );

    if (!result.success) {
      return { success: false, error: result.error, status: result.status };
    }
    const unwrapped = unwrapResponse<{ success: boolean; profiles: RemoteProfileSummary[] }>(
      result.data
    );
    return { success: true, profiles: unwrapped?.profiles, status: 'success' };
  }

  /**
   * Delete remote career profile and all child entities on PostgreSQL.
   */
  async deleteRemoteProfile(
    syncId: string,
    password: string,
    profileId: string,
    retryConfig?: RetryConfig
  ): Promise<{ success: boolean; error?: string; status: SyncStatus }> {
    const requestId = this.generateRequestId();
    const { result } = await this.executeWithRetry(
      async () => {
        return await apiClient.post(
          '/sync',
          {
            action: 'delete_career_profile',
            password,
            profileId,
          },
          {
            headers: {
              'x-sync-id': syncId,
              'x-request-id': requestId,
            },
          }
        );
      },
      'delete_career_profile',
      requestId,
      profileId,
      retryConfig
    );

    if (!result.success) {
      return { success: false, error: result.error, status: result.status };
    }
    return { success: true, status: 'success' };
  }

  /**
   * Operational Health Diagnostic Check
   */
  async checkHealth(): Promise<SyncHealthResult> {
    try {
      const response = await apiClient.get<{
        status: string;
        database: string;
        schemaVersion: number;
      }>('/sync?health=1');

      const unwrapped = unwrapResponse<{ status: string; database: string; schemaVersion: number }>(
        response
      );

      return {
        healthy: unwrapped?.status === 'healthy' || unwrapped?.database === 'connected',
        status: unwrapped?.status,
        database: unwrapped?.database,
        schemaVersion: unwrapped?.schemaVersion,
      };
    } catch (error: unknown) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Sync health check unreachable',
      };
    }
  }

  /**
   * Executes an asynchronous network operation with bounded exponential backoff.
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    action: string,
    requestId: string,
    profileId?: string,
    config?: RetryConfig
  ): Promise<{
    result: {
      success: boolean;
      data?: T;
      status: SyncStatus;
      error?: string;
      errorCategory?: SyncFailureCategory;
      statusCode?: number;
    };
    retries: number;
  }> {
    const maxRetries = config?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;
    const initialDelay = config?.initialDelayMs ?? DEFAULT_RETRY_CONFIG.initialDelayMs;
    const maxDelay = config?.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs;

    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const data = await operation();
        return {
          result: { success: true, data, status: 'success' },
          retries: attempt,
        };
      } catch (error: unknown) {
        const classification = this.classifyError(error);

        // Emit specific telemetry per classification
        if (classification.category === 'auth_failure') {
          careerKnowledgeTelemetry.emit({
            type: 'sync_auth_failure',
            action,
            requestId,
            profileId,
            statusCode: 401,
          });
        } else if (classification.category === 'authorization_failure') {
          careerKnowledgeTelemetry.emit({
            type: 'sync_authorization_failure',
            action,
            requestId,
            profileId,
            statusCode: 403,
          });
        } else if (classification.category === 'conflict') {
          careerKnowledgeTelemetry.emit({
            type: 'sync_conflict',
            action,
            requestId,
            profileId,
            statusCode: 409,
          });
        } else if (classification.category === 'schema_mismatch') {
          careerKnowledgeTelemetry.emit({
            type: 'sync_schema_mismatch',
            action,
            requestId,
            profileId,
            statusCode: 422,
          });
        }

        // If not retryable or max attempts exhausted, return failure
        // A server backoff hint longer than maxDelay means this operation cannot
        // honor it within its retry budget: stop retrying and surface
        // retryable_error so the caller's own schedule handles the wait,
        // instead of retrying early against a rate-limited endpoint.
        if (
          classification.retryAfterSeconds !== undefined &&
          classification.retryAfterSeconds * 1000 > maxDelay
        ) {
          careerKnowledgeTelemetry.emit({
            type: 'sync_failed',
            action,
            requestId,
            profileId,
            errorClass: classification.category,
          });
          return {
            result: {
              success: false,
              status: 'retryable_error',
              error: classification.message,
              errorCategory: classification.category,
              statusCode: classification.statusCode,
            },
            retries: attempt,
          };
        }
        if (!classification.isRetryable || attempt >= maxRetries) {
          const finalStatus: SyncStatus =
            classification.category === 'timeout' ? 'unknown_outcome' : classification.status;

          if (finalStatus === 'unknown_outcome') {
            careerKnowledgeTelemetry.emit({
              type: 'sync_unknown_outcome',
              action,
              requestId,
              profileId,
              errorClass: classification.category,
            });
          } else {
            careerKnowledgeTelemetry.emit({
              type: 'sync_failed',
              action,
              requestId,
              profileId,
              errorClass: classification.category,
            });
          }

          return {
            result: {
              success: false,
              status: finalStatus,
              error: classification.message,
              errorCategory: classification.category,
              statusCode: classification.statusCode,
            },
            retries: attempt,
          };
        }

        // Bounded exponential backoff with jitter
        attempt++;
        let backoffMs = Math.min(
          initialDelay * Math.pow(2, attempt - 1) + Math.random() * 50,
          maxDelay
        );

        if (classification.retryAfterSeconds) {
          // Honor small Retry-After hints within the retry budget.
          // Larger hints are handled above (early return, no early retry).
          backoffMs = Math.min(classification.retryAfterSeconds * 1000, maxDelay);
        }

        careerKnowledgeTelemetry.emit({
          type: 'sync_retry',
          action,
          requestId,
          profileId,
          retryCount: attempt,
          durationMs: backoffMs,
        });

        await this.sleep(backoffMs);
      }
    }

    return {
      result: {
        success: false,
        status: 'retryable_error',
        error: 'Max retries exceeded',
        errorCategory: 'unknown',
      },
      retries: attempt,
    };
  }

  private classifyError(error: unknown): {
    status: SyncStatus;
    category: SyncFailureCategory;
    message: string;
    isRetryable: boolean;
    retryAfterSeconds?: number;
    statusCode?: number;
  } {
    const isAxiosLike =
      axios.isAxiosError(error) ||
      (typeof error === 'object' &&
        error !== null &&
        ('isAxiosError' in error || 'response' in error || 'request' in error || 'code' in error));

    if (isAxiosLike) {
      const axiosErr = error as AxiosError<{
        error?: string;
        code?: string;
        supportedVersion?: number;
      }>;
      const status = axiosErr.response?.status;
      const resData = axiosErr.response?.data;
      const resError = resData?.error;

      // 401 Unauthorized
      if (status === 401) {
        return {
          status: 'auth_failure',
          category: 'auth_failure',
          message: resError || 'Invalid password for this sync ID.',
          isRetryable: false,
          statusCode: status,
        };
      }

      // 403 Forbidden
      if (status === 403) {
        return {
          status: 'authorization_failure',
          category: 'authorization_failure',
          message: resError || 'Forbidden: profile belongs to another account.',
          isRetryable: false,
          statusCode: status,
        };
      }

      // 404 Not Found
      if (status === 404) {
        return {
          status: 'non_retryable_error',
          category: 'validation_error',
          message: resError || 'Profile not found on cloud.',
          isRetryable: false,
          statusCode: status,
        };
      }

      // 409 Conflict (e.g. immutable evidence modified)
      if (status === 409) {
        return {
          status: 'conflict',
          category: 'conflict',
          message:
            resError || 'Conflict: operation violates data integrity or immutability constraints.',
          isRetryable: false,
          statusCode: status,
        };
      }

      // 422 Unprocessable Entity (Schema version mismatch)
      if (status === 422 || resData?.code === 'SCHEMA_VERSION_MISMATCH') {
        return {
          status: 'schema_mismatch',
          category: 'schema_mismatch',
          message: resError || 'Unsupported schema version.',
          isRetryable: false,
          statusCode: status ?? 422,
        };
      }

      // 429 Rate Limited
      if (status === 429) {
        const retryHeader = axiosErr.response?.headers?.['retry-after'];
        const retrySec = retryHeader ? parseInt(String(retryHeader), 10) : undefined;
        return {
          status: 'retryable_error',
          category: 'rate_limited',
          message: resError || 'Rate limit exceeded. Please try again later.',
          isRetryable: true,
          statusCode: status,
          retryAfterSeconds: Number.isFinite(retrySec) ? retrySec : undefined,
        };
      }

      // 400 Bad Request
      if (status === 400) {
        return {
          status: 'non_retryable_error',
          category: 'validation_error',
          message: resError || 'Invalid request payload.',
          isRetryable: false,
          statusCode: status,
        };
      }

      // 5xx Server Errors
      if (status && status >= 500 && status <= 599) {
        return {
          status: 'retryable_error',
          category: 'server_error',
          message: resError || `Server error (${status}).`,
          isRetryable: true,
          statusCode: status,
        };
      }

      // Timeouts
      if (
        axiosErr.code === 'ECONNABORTED' ||
        axiosErr.code === 'ETIMEDOUT' ||
        (axiosErr.message && axiosErr.message.toLowerCase().includes('timeout'))
      ) {
        return {
          status: 'unknown_outcome',
          category: 'timeout',
          message: 'Network request timed out. Outcome is uncertain.',
          isRetryable: true,
        };
      }

      // Generic Network Errors (Offline, DNS, Connection Reset)
      if (axiosErr.request && !axiosErr.response) {
        return {
          status: 'retryable_error',
          category: 'network_error',
          message: 'Network error: could not connect to server.',
          isRetryable: true,
        };
      }

      return {
        status: 'non_retryable_error',
        category: 'unknown',
        message: resError || axiosErr.message,
        isRetryable: false,
      };
    }

    if (error instanceof Error) {
      return {
        status: 'non_retryable_error',
        category: 'unknown',
        message: error.message,
        isRetryable: false,
      };
    }

    return {
      status: 'non_retryable_error',
      category: 'unknown',
      message: 'Unknown error occurred',
      isRetryable: false,
    };
  }

  private generateRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const careerKnowledgeSyncService = new CareerKnowledgeSyncService();
