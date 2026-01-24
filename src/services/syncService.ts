import { db } from '@/lib/db';
import { Interview, UserSettings, Resume } from '@/types';

interface SyncData {
  interviews: Interview[];
  userSettings: UserSettings[];
  resumes: Resume[];
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

  // Import data into Dexie (Overwrite or Merge logic can be refined)
  // For now, we'll clear and restore to ensure exact sync
  importData: async (data: SyncData): Promise<void> => {
    await db.transaction('rw', db.interviews, db.userSettings, db.resumes, async () => {
      await db.interviews.clear();
      await db.userSettings.clear();
      await db.resumes.clear();

      if (data.interviews?.length) await db.interviews.bulkAdd(data.interviews);
      if (data.userSettings?.length) await db.userSettings.bulkAdd(data.userSettings);
      if (data.resumes?.length) await db.resumes.bulkAdd(data.resumes);
    });
  },

  // Upload to Cloud
  uploadToCloud: async (
    id: string,
    password: string,
    data: SyncData
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-id': id,
        },
        body: JSON.stringify({
          password,
          data,
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

  // Download from Cloud
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
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Download error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
