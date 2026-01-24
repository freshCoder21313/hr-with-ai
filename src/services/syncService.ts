import { db } from '@/lib/db';
import { Interview, UserSettings, Resume } from '@/types';
import LZString from 'lz-string';

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
          const localMatch = localSettings.find(l => l.id === cloudSetting.id);
          
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
          const localMatch = localInterviews.find(l => l.createdAt === cloudInterview.createdAt);

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
          const localMatch = localResumes.find(l => l.createdAt === cloudResume.createdAt);

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

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-id': id,
        },
        body: JSON.stringify({
          password,
          data: payload, 
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 401) {
          throw new Error('Invalid password for this ID.');
        }
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Download from Cloud (Decompress)
  downloadFromCloud: async (
    id: string
  ): Promise<{ success: boolean; data?: SyncData; message?: string }> => {
    try {
      const response = await fetch(`/api/sync?id=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Backup not found for this ID.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const result = await response.json();
      const rawData = result.data;

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
    } catch (error) {
      console.error('Download error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
