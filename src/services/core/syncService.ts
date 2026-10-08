import { db } from '@/lib/db';
import { Interview, UserSettings, Resume, SavedJob, SkillAssessmentRecord } from '@/types';
import { DBJobRecommendation } from '@/types';
import LZString from 'lz-string';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import {
  toSafeSyncProfiles,
  mergeImportedProfiles,
  normalizeUserSettings,
  mirrorActiveProfileToLocalStorage,
  stripImportProtectedFields,
} from '@/services/ai/aiProfileService';

import type {
  CareerProfile,
  CareerFact,
  CareerEvidence,
  FactEvidenceLink,
  CareerNote,
} from '@/types/careerKnowledge';
import {
  careerEvidenceSchema,
  careerFactSchema,
  careerNoteSchema,
} from '@/services/careerKnowledge/schemas';

/**
 * Drop the autoincrement `id` so Dexie assigns a fresh one on insert.
 * Object rest avoids the `no-unused-vars` disable the destructuring used to need.
 */
const omitId = <T extends { id?: number }>({ id: _id, ...rest }: T): Omit<T, 'id'> => rest;

export interface SyncData {
  formatVersion?: number;
  interviews: Interview[];
  userSettings: UserSettings[];
  resumes: Resume[];
  /** Optional: absent in backups taken before saved jobs were synced. */
  jobs?: SavedJob[];
  /** Optional: absent in backups taken before job recommendations were synced. */
  jobRecommendations?: DBJobRecommendation[];
  /** Optional: absent in backups taken before Career Knowledge was synced (Phase 14). */
  careerProfiles?: CareerProfile[];
  careerFacts?: CareerFact[];
  careerEvidence?: CareerEvidence[];
  factEvidenceLinks?: FactEvidenceLink[];
  careerNotes?: CareerNote[];
  /** Optional: absent in backups taken before skill assessments were synced. */
  skillAssessments?: SkillAssessmentRecord[];
}

interface CompressedSyncData {
  compressed: string;
}

/**
 * Pairs cloud records with local ones by `createdAt`, guaranteeing each local
 * row is claimed at most once.
 *
 * `createdAt` is only a proxy for identity (local `id` is per-device), and two
 * records can share a millisecond — a bulk import or a batch parse. A plain
 * `.find()` lets every colliding cloud record resolve to the *same* first
 * local row, so N cloud records collapse onto 1 and the rest are re-added as
 * duplicates. Consuming the matched local row keeps the merge 1:1.
 */
function pairByCreatedAt<T extends { createdAt: number }>(
  cloud: T[],
  local: T[]
): Array<{ cloud: T; local: T | undefined }> {
  const unclaimed = new Set(local);
  return cloud.map((cloudRecord) => {
    const match = unclaimed.values().find((l) => l.createdAt === cloudRecord.createdAt);
    if (match) unclaimed.delete(match);
    return { cloud: cloudRecord, local: match };
  });
}

export const syncService = {
  // Generate a random 16-char alphanumeric ID
  generateId: (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
  },

  // Validate Account / Sync ID format (email, username, or legacy 16-char alphanumeric ID)
  validateId: (id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    const trimmed = id.trim();
    const regex = /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_.-]{3,64})$/;
    return regex.test(trimmed);
  },

  // Export local data from Dexie
  exportData: async (
    options: { includeSensitive: boolean; excludeCareerKnowledge?: boolean } = {
      includeSensitive: false,
    }
  ): Promise<SyncData> => {
    const interviews = db.interviews ? await db.interviews.toArray() : [];
    const userSettings = db.userSettings ? await db.userSettings.toArray() : [];
    const resumes = db.resumes ? await db.resumes.toArray() : [];
    const jobs = db.jobs ? await db.jobs.toArray() : [];
    const jobRecommendations = db.job_recommendations ? await db.job_recommendations.toArray() : [];
    const skillAssessments = db.skillAssessments ? await db.skillAssessments.toArray() : [];

    // Strip sensitive fields unless explicitly requested
    const safeSettings = userSettings.map((s) => {
      if (options.includeSensitive) {
        return s;
      }
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        id,
        apiKey,
        githubToken,
        githubUsername,
        googleCloudApiKey,
        elevenLabsApiKey,
        deepgramApiKey,
        aiProfiles,
        ...safe
      } = s;
      /* eslint-enable @typescript-eslint/no-unused-vars */

      return {
        ...safe,
        aiProfiles: aiProfiles ? toSafeSyncProfiles(aiProfiles) : undefined,
      } as UserSettings;
    });

    // Career Knowledge entities (Phase 14). Excluded on the legacy backup path
    // (server cap ~2 MiB) — CK has its own relational sync path.
    if (options.excludeCareerKnowledge) {
      return {
        formatVersion: 2,
        interviews,
        userSettings: safeSettings,
        resumes,
        jobs,
        jobRecommendations,
        skillAssessments,
      };
    }
    const careerProfiles = db.careerProfiles ? await db.careerProfiles.toArray() : [];
    const careerFacts = db.careerFacts ? await db.careerFacts.toArray() : [];
    const careerEvidence = db.careerEvidence ? await db.careerEvidence.toArray() : [];
    const factEvidenceLinks = db.factEvidenceLinks ? await db.factEvidenceLinks.toArray() : [];
    const careerNotes = db.careerNotes ? await db.careerNotes.toArray() : [];

    return {
      formatVersion: 2,
      interviews,
      userSettings: safeSettings,
      resumes,
      jobs,
      jobRecommendations,
      careerProfiles,
      careerFacts,
      careerEvidence,
      factEvidenceLinks,
      careerNotes,
      skillAssessments,
    };
  },

  // Merge Logic: Smartly merge cloud data into local DB
  importData: async (cloudData: SyncData): Promise<void> => {
    const tablesToLock = [
      db.interviews,
      db.userSettings,
      db.resumes,
      db.jobs,
      db.job_recommendations,
      db.careerProfiles,
      db.careerFacts,
      db.careerEvidence,
      db.factEvidenceLinks,
      db.careerNotes,
      db.skillAssessments,
    ].filter(Boolean);

    await db.transaction('rw', tablesToLock, async () => {
      // 1. Merge User Settings (Usually singleton)
      if (cloudData.userSettings?.length && db.userSettings) {
        const localSettings = await db.userSettings.toArray();
        for (const rawCloudSetting of cloudData.userSettings) {
          // Untrusted input: an imported baseUrl/secret would redirect the user's
          // real API key and resume data to an attacker endpoint (docs/SECURITY.md).
          const cloudSetting = stripImportProtectedFields(rawCloudSetting);
          const localMatch = localSettings.find((l) => l.id === cloudSetting.id);

          if (!localMatch) {
            await db.userSettings.add(cloudSetting);
          } else {
            // Compare timestamps
            const cloudTime = cloudSetting.updatedAt || 0;
            const localTime = localMatch.updatedAt || 0;
            if (cloudTime > localTime) {
              // Overwrite with newer cloud version, but PRESERVE local keys
              // if cloud version is from a 'safe' export (stripped keys)
              await db.userSettings.put({
                ...cloudSetting,
                apiKey: cloudSetting.apiKey || localMatch.apiKey,
                baseUrl: localMatch.baseUrl,
                githubToken: cloudSetting.githubToken || localMatch.githubToken,
                githubUsername: cloudSetting.githubUsername || localMatch.githubUsername,
                googleCloudApiKey: cloudSetting.googleCloudApiKey || localMatch.googleCloudApiKey,
                elevenLabsApiKey: cloudSetting.elevenLabsApiKey || localMatch.elevenLabsApiKey,
                deepgramApiKey: cloudSetting.deepgramApiKey || localMatch.deepgramApiKey,
                // Merge AI profiles safely
                aiProfiles: mergeImportedProfiles(
                  localMatch.aiProfiles || [],
                  cloudSetting.aiProfiles || []
                ),
              });
            }
          }
        }
      }

      // 2. Merge Interviews (match by createdAt as proxy for unique ID, one
      //    local row per cloud row)
      if (cloudData.interviews?.length && db.interviews) {
        const localInterviews = await db.interviews.toArray();
        for (const { cloud: cloudInterview, local: localMatch } of pairByCreatedAt(
          cloudData.interviews,
          localInterviews
        )) {
          if (!localMatch) {
            // New item, delete local 'id' to let Dexie auto-increment
            await db.interviews.add(omitId(cloudInterview));
          } else {
            const cloudTime = cloudInterview.updatedAt || 0;
            const localTime = localMatch.updatedAt || 0;
            if (cloudTime > localTime) {
              // Update existing record, preserving the LOCAL id
              await db.interviews.put({ ...cloudInterview, id: localMatch.id });
            }
          }
        }
      }

      // 3. Merge Resumes (match by createdAt, one local row per cloud row)
      if (cloudData.resumes?.length && db.resumes) {
        const localResumes = await db.resumes.toArray();
        for (const { cloud: cloudResume, local: localMatch } of pairByCreatedAt(
          cloudData.resumes,
          localResumes
        )) {
          if (!localMatch) {
            await db.resumes.add(omitId(cloudResume));
          } else {
            const cloudTime = cloudResume.updatedAt || 0;
            const localTime = localMatch.updatedAt || 0;
            if (cloudTime > localTime) {
              await db.resumes.put({ ...cloudResume, id: localMatch.id });
            }
          }
        }
      }

      // 4. Merge Saved Job Templates (match by createdAt, one local row per
      //    cloud row; local 'id' is auto-increment and differs per device)
      if (cloudData.jobs?.length && db.jobs) {
        const localJobs = await db.jobs.toArray();
        for (const { cloud: cloudJob, local: localMatch } of pairByCreatedAt(
          cloudData.jobs,
          localJobs
        )) {
          if (!localMatch) {
            await db.jobs.add(omitId(cloudJob));
          } else {
            const cloudTime = cloudJob.updatedAt || 0;
            const localTime = localMatch.updatedAt || 0;
            if (cloudTime > localTime) {
              await db.jobs.put({ ...cloudJob, id: localMatch.id });
            }
          }
        }
      }

      // 5. Merge Job Recommendations (Match by createdAt + title + company;
      //    recommendations have no updatedAt to compare on)
      if (cloudData.jobRecommendations?.length && db.job_recommendations) {
        const localRecs = await db.job_recommendations.toArray();
        for (const cloudRec of cloudData.jobRecommendations) {
          const localMatch = localRecs.find(
            (l) =>
              l.createdAt === cloudRec.createdAt &&
              l.title === cloudRec.title &&
              l.company === cloudRec.company
          );

          if (!localMatch) {
            await db.job_recommendations.add(omitId(cloudRec));
          }
        }
      }

      // 6. Merge Career Knowledge (Phase 14)
      const hasCK =
        cloudData.careerProfiles?.length ||
        cloudData.careerFacts?.length ||
        cloudData.careerEvidence?.length ||
        cloudData.factEvidenceLinks?.length ||
        cloudData.careerNotes?.length;

      if (hasCK && db.careerProfiles && db.careerFacts && db.careerEvidence) {
        // A. Merge Profiles
        if (cloudData.careerProfiles) {
          for (const remoteProf of cloudData.careerProfiles) {
            const localProf = await db.careerProfiles.get(remoteProf.id);
            if (!localProf) {
              await db.careerProfiles.add(remoteProf);
            } else {
              const localTime = new Date(localProf.updatedAt).getTime() || 0;
              const cloudTime = new Date(remoteProf.updatedAt).getTime() || 0;
              if (cloudTime > localTime) {
                await db.careerProfiles.put(remoteProf);
              }
            }
          }
        }

        // B. Merge Evidence (Immutable provenance)
        if (cloudData.careerEvidence) {
          for (const remoteEv of cloudData.careerEvidence) {
            const localEv = await db.careerEvidence.get(remoteEv.id);
            if (!localEv) {
              // Untrusted payload: schema-validate before accepting.
              const parsed = careerEvidenceSchema.safeParse(remoteEv);
              if (!parsed.success) {
                logger.warn(
                  `Skipping invalid career evidence "${(remoteEv as { id?: unknown }).id}" during sync import.`
                );
                continue;
              }
              await db.careerEvidence.add(parsed.data as CareerEvidence);
            } else {
              if (
                localEv.sourceType !== remoteEv.sourceType ||
                localEv.sourceRef !== remoteEv.sourceRef ||
                localEv.excerpt !== remoteEv.excerpt ||
                localEv.url !== remoteEv.url
              ) {
                logger.warn(
                  `Evidence "${remoteEv.id}" content divergence during sync import; preserving local immutable record.`
                );
              }
            }
          }
        }

        // C. Merge Facts (Verification Invariant Protection)
        if (cloudData.careerFacts) {
          for (const remoteFact of cloudData.careerFacts) {
            const localFact = await db.careerFacts.get(remoteFact.id);
            if (!localFact) {
              // Untrusted payload: schema-validate before accepting so a
              // malformed blob cannot mint records (incl. confirmed facts).
              const parsed = careerFactSchema.safeParse(remoteFact);
              if (!parsed.success) {
                logger.warn(
                  `Skipping invalid career fact "${(remoteFact as { id?: unknown }).id}" during sync import.`
                );
                continue;
              }
              await db.careerFacts.add(parsed.data as CareerFact);
            } else {
              let targetVerificationState = localFact.verificationState;

              if (localFact.verificationState === 'confirmed') {
                targetVerificationState = 'confirmed';
              } else if (remoteFact.verificationState === 'confirmed') {
                targetVerificationState = 'confirmed';
              } else if (remoteFact.verificationState === 'rejected') {
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
                      origin: remoteFact.origin,
                      updatedAt: remoteFact.updatedAt,
                    }
                  : {}),
                verificationState: targetVerificationState,
                supersededBy: remoteFact.supersededBy ?? localFact.supersededBy,
              };

              await db.careerFacts.put(mergedFact);
            }
          }
        }

        // D. Merge Links (Idempotent)
        if (cloudData.factEvidenceLinks && db.factEvidenceLinks) {
          for (const remoteLink of cloudData.factEvidenceLinks) {
            const existing = await db.factEvidenceLinks.get([
              remoteLink.factId,
              remoteLink.evidenceId,
            ]);
            if (!existing) {
              await db.factEvidenceLinks.put(remoteLink);
            }
          }
        }

        // E. Merge Notes
        if (cloudData.careerNotes && db.careerNotes) {
          for (const remoteNote of cloudData.careerNotes) {
            const localNote = await db.careerNotes.get(remoteNote.id);
            if (!localNote) {
              const parsed = careerNoteSchema.safeParse(remoteNote);
              if (!parsed.success) {
                logger.warn(
                  `Skipping invalid career note "${(remoteNote as { id?: unknown }).id}" during sync import.`
                );
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
      }

      // 7. Merge Skill Assessments
      if (
        cloudData.skillAssessments &&
        cloudData.skillAssessments.length > 0 &&
        db.skillAssessments
      ) {
        const localAssessments = db.skillAssessments.toArray
          ? await db.skillAssessments.toArray()
          : [];
        for (const record of cloudData.skillAssessments) {
          const localMatch = localAssessments.find(
            (l) => l.createdAt === record.createdAt && l.skill === record.skill
          );
          if (!localMatch) {
            await db.skillAssessments.add(omitId(record));
          }
        }
      }
    });

    // Post-import synchronization: ensure profiles and mirror keys are consistent
    if (db.userSettings?.orderBy) {
      const latestSettings = await db.userSettings.orderBy('id').first();
      if (latestSettings) {
        const normalized = normalizeUserSettings(latestSettings);
        mirrorActiveProfileToLocalStorage(normalized);
      }
    }
  },

  // Upload to Cloud (Compressed)
  uploadToCloud: async (
    id: string,
    password: string,
    data: SyncData
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      // Compress data
      const jsonString = JSON.stringify(data);
      // Use Base64 which is safer for storage/transport than UTF16
      const compressedString = LZString.compressToBase64(jsonString);

      // Wrap in object to satisfy JSONB if server requires it, or just consistency
      const payload: CompressedSyncData = { compressed: compressedString };

      // Pre-flight guard against the server MAX_PAYLOAD_BYTES cap (~2 MiB).
      // Career Knowledge evidence excerpts can blow past it; legacy callers
      // should export with excludeCareerKnowledge:true instead.
      try {
        const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
        if (payloadBytes > 2 * 1024 * 1024) {
          return {
            success: false,
            message:
              'Backup too large for legacy sync (over ~2 MiB). Sync Career Knowledge separately via the Career Sync tab, or remove large evidence excerpts.',
          };
        }
      } catch {
        // Size check is best-effort; let the server enforce the cap.
      }

      await apiClient.post(
        '/sync',
        {
          password,
          data: payload,
        },
        {
          headers: {
            'x-sync-id': id,
          },
        }
      );

      return { success: true };
    } catch (error: unknown) {
      logger.error('Upload error:', error);
      let message = 'Unknown error';

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429)
          message = 'Rate limit exceeded. Please try again later.';
        else if (error.response?.status === 401) message = 'Invalid password for this ID.';
        else message = `Upload failed: ${error.response?.statusText || error.message}`;
      } else if (error instanceof Error) {
        message = error.message;
      }

      return { success: false, message };
    }
  },

  // Download from Cloud (Decompress)
  downloadFromCloud: async (
    id: string
  ): Promise<{ success: boolean; data?: SyncData; message?: string }> => {
    try {
      const result = await apiClient.get<{ data: CompressedSyncData }>(`/sync`, {
        params: { id, t: Date.now() }, // Add timestamp to bypass browser cache
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      // The response interceptor returns 'response.data', but our API structure might be { data: ... }
      // based on the previous code: const result = await response.json(); const rawData = result.data;
      // So 'result' here is equivalent to the old 'result' object.

      // However, if the API returns the data directly (without wrapper), adjust accordingly.
      // Assuming existing API returns JSON: { data: { compressed: "..." } }
      const rawData = result.data;

      // Check if data is compressed
      let finalData: SyncData;

      if (rawData && typeof rawData === 'object' && 'compressed' in rawData && rawData.compressed) {
        // Decompress - Try Base64 first (new format), then UTF16 (legacy/fallback)
        let decompressed = LZString.decompressFromBase64(rawData.compressed as string);
        if (!decompressed) {
          decompressed = LZString.decompressFromUTF16(rawData.compressed as string);
        }

        if (!decompressed) throw new Error('Failed to decompress data');
        finalData = JSON.parse(decompressed) as SyncData;
      } else {
        // Fallback for legacy uncompressed data
        finalData = rawData as unknown as SyncData;
      }

      return { success: true, data: finalData };
    } catch (error: unknown) {
      logger.error('Download error:', error);
      let message = 'Unknown error';

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) message = 'Backup not found for this ID.';
        else if (error.response?.status === 429)
          message = 'Rate limit exceeded. Please try again later.';
        else message = `Download failed: ${error.response?.statusText || error.message}`;
      } else if (error instanceof Error) {
        message = error.message;
      }

      return { success: false, message };
    }
  },
};
