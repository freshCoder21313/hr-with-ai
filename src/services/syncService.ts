import { db } from '@/lib/db';
import { Interview, UserSettings, Resume } from '@/types';
import LZString from 'lz-string';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';

interface SyncData {
  interviews: Interview[];
  userSettings: UserSettings[];
  resumes: Resume[];
}

interface CompressedSyncData {
  compressed: string;
}

export const syncService = {
  // Generate a random 16-char alphanumeric ID
  generateId: (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Validate ID format (16 alphanumeric chars)
  validateId: (id: string): boolean => {
    const regex = /^[a-zA-Z0-9]{16}$/;
    return regex.test(id);
  },

  // Export local data from Dexie
  exportData: async (): Promise<SyncData> => {
    const interviews = await db.interviews.toArray();
    const userSettings = await db.userSettings.toArray();
    const resumes = await db.resumes.toArray();

    return {
      interviews,
      userSettings,
      resumes,
    };
  },

  // Merge Logic: Smartly merge cloud data into local DB
  importData: async (cloudData: SyncData): Promise<void> => {
    await db.transaction('rw', db.interviews, db.userSettings, db.resumes, async () => {
      // 1. Merge User Settings (Usually singleton)
      if (cloudData.userSettings?.length) {
        const localSettings = await db.userSettings.toArray();
        for (const cloudSetting of cloudData.userSettings) {
          const localMatch = localSettings.find((l) => l.id === cloudSetting.id);

          if (!localMatch) {
            await db.userSettings.add(cloudSetting);
          } else {
            // Compare timestamps
            const cloudTime = cloudSetting.updatedAt || 0;
            const localTime = localMatch.updatedAt || 0;
            if (cloudTime > localTime) {
              await db.userSettings.put(cloudSetting); // Overwrite with newer cloud version
            }
          }
        }
      }

      // 2. Merge Interviews (Match by createdAt as proxy for unique ID)
      if (cloudData.interviews?.length) {
        const localInterviews = await db.interviews.toArray();
        for (const cloudInterview of cloudData.interviews) {
          // We use createdAt as a stable ID because local 'id' is auto-increment and changes per device
          const localMatch = localInterviews.find((l) => l.createdAt === cloudInterview.createdAt);

          if (!localMatch) {
            // New item, delete local 'id' to let Dexie auto-increment
            const { id: _id, ...dataToSave } = cloudInterview;
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

      // 3. Merge Resumes (Match by createdAt)
      if (cloudData.resumes?.length) {
        const localResumes = await db.resumes.toArray();
        for (const cloudResume of cloudData.resumes) {
          const localMatch = localResumes.find((l) => l.createdAt === cloudResume.createdAt);

          if (!localMatch) {
            const { id: _id, ...dataToSave } = cloudResume;
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
    });
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
    } catch (error: any) {
      console.error('Upload error:', error);
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
      const result = await apiClient.get<{ data: any }>(`/sync`, {
        params: { id },
      });

      // The response interceptor returns 'response.data', but our API structure might be { data: ... }
      // based on the previous code: const result = await response.json(); const rawData = result.data;
      // So 'result' here is equivalent to the old 'result' object.

      // However, if the API returns the data directly (without wrapper), adjust accordingly.
      // Assuming existing API returns JSON: { data: { compressed: "..." } }
      const rawData = (result as any).data;

      // Check if data is compressed
      let finalData: SyncData;

      if (rawData && typeof rawData === 'object' && rawData.compressed) {
        // Decompress - Try Base64 first (new format), then UTF16 (legacy/fallback)
        let decompressed = LZString.decompressFromBase64(rawData.compressed);
        if (!decompressed) {
          decompressed = LZString.decompressFromUTF16(rawData.compressed);
        }

        if (!decompressed) throw new Error('Failed to decompress data');
        finalData = JSON.parse(decompressed);
      } else {
        // Fallback for legacy uncompressed data
        finalData = rawData;
      }

      return { success: true, data: finalData };
    } catch (error: any) {
      console.error('Download error:', error);
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
