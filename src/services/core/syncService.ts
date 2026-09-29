import { db } from '@/lib/db';
import { Interview, UserSettings, Resume, SavedJob } from '@/types';
import { DBJobRecommendation } from '@/services/jobs/jobRecommendationService';
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

interface SyncData {
  interviews: Interview[];
  userSettings: UserSettings[];
  resumes: Resume[];
  /** Optional: absent in backups taken before saved jobs were synced. */
  jobs?: SavedJob[];
  /** Optional: absent in backups taken before job recommendations were synced. */
  jobRecommendations?: DBJobRecommendation[];
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

  // Validate ID format (16 alphanumeric chars)
  validateId: (id: string): boolean => {
    const regex = /^[a-zA-Z0-9]{16}$/;
    return regex.test(id);
  },

  // Export local data from Dexie
  exportData: async (
    options: { includeSensitive: boolean } = { includeSensitive: false }
  ): Promise<SyncData> => {
    const interviews = await db.interviews.toArray();
    const userSettings = await db.userSettings.toArray();
    const resumes = await db.resumes.toArray();
    const jobs = await db.jobs.toArray();
    const jobRecommendations = await db.job_recommendations.toArray();

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

    return {
      interviews,
      userSettings: safeSettings,
      resumes,
      jobs,
      jobRecommendations,
    };
  },

  // Merge Logic: Smartly merge cloud data into local DB
  importData: async (cloudData: SyncData): Promise<void> => {
    await db.transaction(
      'rw',
      [db.interviews, db.userSettings, db.resumes, db.jobs, db.job_recommendations],
      async () => {
      // 1. Merge User Settings (Usually singleton)
      if (cloudData.userSettings?.length) {
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
      if (cloudData.interviews?.length) {
        const localInterviews = await db.interviews.toArray();
        for (const { cloud: cloudInterview, local: localMatch } of pairByCreatedAt(
          cloudData.interviews,
          localInterviews
        )) {
          if (!localMatch) {
            // New item, delete local 'id' to let Dexie auto-increment
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...dataToSave } = cloudInterview;
            await db.interviews.add(dataToSave as Interview);
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
      if (cloudData.resumes?.length) {
        const localResumes = await db.resumes.toArray();
        for (const { cloud: cloudResume, local: localMatch } of pairByCreatedAt(
          cloudData.resumes,
          localResumes
        )) {
          if (!localMatch) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...dataToSave } = cloudResume;
            await db.resumes.add(dataToSave as Resume);
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
      if (cloudData.jobs?.length) {
        const localJobs = await db.jobs.toArray();
        for (const { cloud: cloudJob, local: localMatch } of pairByCreatedAt(
          cloudData.jobs,
          localJobs
        )) {
          if (!localMatch) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...dataToSave } = cloudJob;
            await db.jobs.add(dataToSave as SavedJob);
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
      if (cloudData.jobRecommendations?.length) {
        const localRecs = await db.job_recommendations.toArray();
        for (const cloudRec of cloudData.jobRecommendations) {
          const localMatch = localRecs.find(
            (l) =>
              l.createdAt === cloudRec.createdAt &&
              l.title === cloudRec.title &&
              l.company === cloudRec.company
          );

          if (!localMatch) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...dataToSave } = cloudRec;
            await db.job_recommendations.add(dataToSave as DBJobRecommendation);
          }
        }
      }
      }
    );

    // Post-import synchronization: ensure profiles and mirror keys are consistent
    const latestSettings = await db.userSettings.orderBy('id').first();
    if (latestSettings) {
      const normalized = normalizeUserSettings(latestSettings);
      mirrorActiveProfileToLocalStorage(normalized);
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
        params: { id, t: Date.now() }, // Thêm timestamp để bypass browser cache
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
